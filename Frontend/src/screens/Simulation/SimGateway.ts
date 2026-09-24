import { BROADCAST_ADDRESS, RAD_TO_DEG } from '../../Consts/SimulationConsts';
import { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import { SwarmitDeviceStatus } from '../../enums/SwarmitDeviceStatus.enum';
import { describeCommand } from '../../Integration/FleetLink';
import type { FleetCommand, FleetLink, FleetUplink, SwarmitCommand } from '../../Integration/FleetLink';
import { batteryToMillivolts } from '../../Integration/Protocols/DotBot.Payload';
import type { DotBotAdvertisement } from '../../Integration/Protocols/DotBot.Payload';
import type { SimRobot } from './SimRobot';
import type { SimWorld } from './SimWorld';
import { NetChannel, netParamsFromSim } from './SimNetModel';
import type { NetChannelStats } from './SimNetModel';
import { SwarmitDevice } from './SwarmitDevice';

// SimGateway — o runtime do gateway simulado (SimWorld ⇄ FleetLink). Porte do
// RobotSwarmSimulator (src/net/gateway.ts), que implementa o contrato de
// ciclo de vida do fio:
//   - ao iniciar: GATEWAY_INFO + um NODE_JOINED por robô online;
//   - loop: NODE_KEEP_ALIVE por robô (~1 s) + GATEWAY_INFO periódico e
//     NODE_DATA+DOTBOT_ADVERTISEMENT por robô a cada 1/advertise_hz;
//   - robô que cai (bateria 0 / falha injetada) sai da rede: para de falar e
//     emite NODE_LEFT uma vez; ao voltar, NODE_JOINED de novo;
//   - rx: comandos roteados por destination (address ou broadcast) — robô
//     offline não recebe nada;
//   - TODO uplink e TODO downlink atravessam o modelo de rede (PDR/latência),
//     com os parâmetros lidos VIVOS de world.sim.
//
// Diferenças em relação ao original (todas por causa do navegador):
//   - sem timer próprio: quem avança é o loop de animação da tela, que chama
//     `stepTicks(n)` com ticks fixos já calculados (planTicks) — uma fonte de
//     tempo só;
//   - a camada swarmit liga/desliga ao vivo (`setSwarmitEnabled`);
//   - com a camada swarmit LIGADA, só robô em `Running` roda o app DotBot:
//     em Bootloader/Programming ele fica parado, não emite
//     DOTBOT_ADVERTISEMENT e descarta comandos DotBot — igual ao hardware
//     (o robô sempre boota no bootloader e o backend não o enxerga até um
//     START; ver a memória "rede Mari — estado real" do projeto).

/** theta (rad, núcleo) → direction (graus inteiros em [0, 360)). */
export function directionFromTheta(thetaRad: number): number {
  const deg = Math.round(thetaRad * RAD_TO_DEG);
  return ((deg % 360) + 360) % 360;
}

const clampU32 = (v: number) => Math.min(0xffffffff, Math.max(0, Math.round(v)));
const clampI32 = (v: number) => Math.min(0x7fffffff, Math.max(-0x80000000, Math.round(v)));

/** Estado do robô → campos do DOTBOT_ADVERTISEMENT (unidades do fio). */
export function robotToAdvertisement(robot: SimRobot): DotBotAdvertisement {
  const target =
    robot.waypoints.length > 0 ? robot.waypoints[Math.min(robot.waypoint_idx, robot.waypoints.length - 1)] : undefined;
  return {
    // Sem Lighthouse de verdade: o simulador se declara calibrado no LH2
    // (bit 0x02) pro backend confiar em pos_x/pos_y.
    calibrated: 0x02,
    direction: directionFromTheta(robot.theta),
    pos_x: clampU32(robot.pos_x),
    pos_y: clampU32(robot.pos_y),
    battery: batteryToMillivolts(robot.battery),
    pwm_left: robot.pwm_left,
    pwm_right: robot.pwm_right,
    mode: robot.mode,
    encoder_left: clampI32(robot.encoder_left),
    encoder_right: clampI32(robot.encoder_right),
    waypoint_x: target ? clampU32(target.x) : 0,
    waypoint_y: target ? clampU32(target.y) : 0,
    waypoint_idx: Math.min(0xff, robot.waypoint_idx),
  };
}

/** Robôs-alvo de um destination (address exato ou broadcast) — só os ONLINE. */
export function resolveTargets(world: SimWorld, destination: string): SimRobot[] {
  const dest = destination.toUpperCase();
  if (dest === BROADCAST_ADDRESS) return world.robots.filter((r) => r.online);
  const robot = world.getRobot(dest);
  return robot && robot.online ? [robot] : [];
}

/** Aplica um comando DotBot num robô (o "rx" do gateway). */
export function applyCommand(robot: SimRobot, cmd: Exclude<FleetCommand, SwarmitCommand>): void {
  switch (cmd.kind) {
    case 'move-raw':
      robot.applyMoveRaw(cmd.left_x, cmd.left_y, cmd.right_x, cmd.right_y);
      break;
    case 'rgb':
      robot.setRgb(cmd.red, cmd.green, cmd.blue);
      break;
    case 'control-mode':
      robot.setMode(cmd.mode === DotBotControlMode.Auto ? DotBotControlMode.Auto : DotBotControlMode.Manual);
      break;
    case 'waypoints':
      robot.setWaypoints(cmd.waypoints, cmd.threshold);
      break;
  }
}

export interface SimGatewayOptions {
  world: SimWorld;
  link: FleetLink;
  /** Intervalo do NODE_KEEP_ALIVE (+ GATEWAY_INFO periódico), s. Default 1. */
  keepAliveIntervalS?: number;
  /** Escalona o advertise dos robôs (fase i/N) pra frota não publicar tudo no mesmo tick. Default true. */
  staggerAdvertise?: boolean;
  /** Seed do RNG do modelo de rede (determinístico). */
  netSeed?: number;
  swarmitEnabled?: boolean;
  /** Heartbeat SWARMIT_STATUS por robô, Hz. Default 1. */
  swarmitStatusHz?: number;
  log?: (msg: string) => void;
}

export interface SwarmitDeviceView {
  status: SwarmitDeviceStatus;
  flashProgress: number;
}

const EPS = 1e-9;

export class SimGateway {
  private readonly world: SimWorld;
  private readonly link: FleetLink;
  private readonly keepAliveIntervalS: number;
  private readonly staggerAdvertise: boolean;
  private readonly swarmitStatusIntervalS: number;
  private readonly log: (msg: string) => void;

  private nextKeepAliveAt = 0;
  private readonly nextAdvertiseAt = new Map<string, number>();
  private readonly wasOnline = new Map<string, boolean>();
  private started = false;

  private swarmitOn: boolean;
  private readonly swarmitDevices = new Map<string, SwarmitDevice>();
  private nextSwarmitStatusAt = 0;

  private readonly uplinkNet: NetChannel<FleetUplink>;
  private readonly downlinkNet: NetChannel<FleetCommand>;

  constructor(opts: SimGatewayOptions) {
    this.world = opts.world;
    this.link = opts.link;
    this.keepAliveIntervalS = opts.keepAliveIntervalS ?? 1;
    this.staggerAdvertise = opts.staggerAdvertise ?? true;
    this.swarmitOn = opts.swarmitEnabled ?? false;
    this.swarmitStatusIntervalS = 1 / (opts.swarmitStatusHz ?? 1);
    this.log = opts.log ?? (() => {});
    const seed = opts.netSeed ?? 0x5eedc0de;
    // Uplink e downlink com RNGs próprios: a fração de perda de um sentido não depende do tráfego do outro.
    this.uplinkNet = new NetChannel<FleetUplink>(seed, (u) => this.link.publishUplink(u));
    this.downlinkNet = new NetChannel<FleetCommand>(seed ^ 0x9e3779b9, (cmd) => this.applyDownlink(cmd));
  }

  get netStats(): { uplink: NetChannelStats; downlink: NetChannelStats } {
    return { uplink: this.uplinkNet.stats, downlink: this.downlinkNet.stats };
  }

  get swarmitEnabled(): boolean {
    return this.swarmitOn;
  }

  get advertiseIntervalS(): number {
    const hz = this.world.sim.advertise_hz;
    return hz > 0 ? 1 / hz : 0.5;
  }

  private sendUplink(uplink: FleetUplink): void {
    this.uplinkNet.send(uplink, this.world.time, netParamsFromSim(this.world.sim));
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.link.onCommand((cmd) => this.handleCommand(cmd));
    await this.link.start();
    this.started = true;

    this.publishGatewayInfo();
    for (const robot of this.world.robots) {
      this.wasOnline.set(robot.address, robot.online);
      if (!robot.online) continue;
      this.sendUplink({ kind: 'node-joined', address: robot.address });
    }

    this.nextKeepAliveAt = this.world.time + this.keepAliveIntervalS;
    const interval = this.advertiseIntervalS;
    const n = this.world.robots.length;
    this.world.robots.forEach((robot, i) => {
      const offset = this.staggerAdvertise && n > 1 ? (interval * i) / n : 0;
      this.nextAdvertiseAt.set(robot.address, this.world.time + interval + offset);
    });

    if (this.swarmitOn) this.bootSwarmit();
    this.log(`gateway simulado iniciado · rede ${this.world.network.id} · ${n} robô(s)`);
  }

  async stop(): Promise<void> {
    this.started = false;
    this.uplinkNet.clear();
    this.downlinkNet.clear();
    await this.link.stop();
  }

  /** Avança `ticks` passos fixos de 1/tick_hz, emitindo o que venceu. */
  stepTicks(ticks: number): void {
    if (!this.started) return;
    for (let i = 0; i < ticks; i++) {
      this.syncAppRunning();
      this.world.tick();
      this.emitLifecycleTransitions();
      this.emitDue();
      this.uplinkNet.advanceTo(this.world.time);
      this.downlinkNet.advanceTo(this.world.time);
    }
  }

  // ---- swarmit --------------------------------------------------------------

  /** Liga/desliga a camada swarmit ao vivo. Ligar = robôs "recém-ligados": todos no Bootloader. */
  setSwarmitEnabled(on: boolean): void {
    if (on === this.swarmitOn) return;
    this.swarmitOn = on;
    if (on) {
      this.bootSwarmit();
    } else {
      this.swarmitDevices.clear();
      this.log('camada swarmit DESLIGADA — app DotBot rodando em todos os robôs');
    }
    this.syncAppRunning();
  }

  swarmitView(address: string): SwarmitDeviceView | null {
    const dev = this.swarmitDevices.get(address);
    return dev ? { status: dev.status, flashProgress: dev.flashProgress } : null;
  }

  private bootSwarmit(): void {
    this.swarmitDevices.clear();
    for (const robot of this.world.robots) this.swarmitDevices.set(robot.address, new SwarmitDevice(robot));
    this.nextSwarmitStatusAt = this.world.time + this.swarmitStatusIntervalS;
    this.log('camada swarmit LIGADA — robôs no Bootloader, esperando START');
  }

  /** Com swarmit ligado, só roda o app DotBot quem está em Running. */
  private syncAppRunning(): void {
    for (const robot of this.world.robots) {
      const dev = this.swarmitDevices.get(robot.address);
      robot.appRunning = !this.swarmitOn || (dev?.status ?? SwarmitDeviceStatus.Bootloader) === SwarmitDeviceStatus.Running;
    }
  }

  // ---- uplinks periódicos -----------------------------------------------------

  private emitLifecycleTransitions(): void {
    for (const robot of this.world.robots) {
      const was = this.wasOnline.get(robot.address) ?? false;
      if (robot.online === was) continue;
      this.wasOnline.set(robot.address, robot.online);
      if (robot.online) {
        this.sendUplink({ kind: 'node-joined', address: robot.address });
        this.log(`⇧ NODE_JOINED ${robot.address} (voltou à rede)`);
      } else {
        this.sendUplink({ kind: 'node-left', address: robot.address });
        this.log(`⇧ NODE_LEFT ${robot.address} (${robot.battery <= 0 ? 'bateria zerada' : 'falha injetada'})`);
      }
    }
  }

  private emitDue(): void {
    const t = this.world.time + EPS;
    const interval = this.advertiseIntervalS;
    for (const robot of this.world.robots) {
      let next = this.nextAdvertiseAt.get(robot.address) ?? this.world.time + interval;
      while (t >= next) {
        // offline (ou sem app rodando): o slot passa em silêncio, mas o relógio avança
        if (robot.online && robot.appRunning) {
          this.sendUplink({ kind: 'node-data', source: robot.address, payload: robotToAdvertisement(robot) });
        }
        next += interval;
      }
      this.nextAdvertiseAt.set(robot.address, next);
    }

    while (t >= this.nextKeepAliveAt) {
      for (const robot of this.world.robots) {
        if (robot.online) this.sendUplink({ kind: 'node-keep-alive', address: robot.address });
      }
      // GATEWAY_INFO junto do keep-alive: um backend que conecta tarde redescobre gateway + frota.
      this.publishGatewayInfo();
      this.nextKeepAliveAt += this.keepAliveIntervalS;
    }

    if (this.swarmitOn) {
      while (t >= this.nextSwarmitStatusAt) {
        for (const robot of this.world.robots) {
          const device = this.swarmitDevices.get(robot.address);
          if (!robot.online || !device) continue;
          this.sendUplink({ kind: 'swarmit-data', source: robot.address, payload: device.heartbeat() });
        }
        this.nextSwarmitStatusAt += this.swarmitStatusIntervalS;
      }
    }
  }

  private publishGatewayInfo(): void {
    this.sendUplink({
      kind: 'gateway-info',
      asn: BigInt(Math.round(this.world.time * 100)), // slots de 10 ms — só precisa ser monotônico
      timer: Math.min(0xffffffff, Math.round(this.world.time * 1000)),
    });
  }

  // ---- downlink ---------------------------------------------------------------

  private handleCommand(cmd: FleetCommand): void {
    const delivered = this.downlinkNet.send(cmd, this.world.time, netParamsFromSim(this.world.sim));
    if (!delivered) this.log(`✕ ${describeCommand(cmd)} → ${cmd.destination} perdido na rede (PDR)`);
  }

  /** Entrega efetiva — os alvos são resolvidos NA ENTREGA (quem caiu enquanto o comando atrasava não recebe). */
  private applyDownlink(cmd: FleetCommand): void {
    if (cmd.kind === 'swarmit') {
      this.applySwarmitDownlink(cmd);
      return;
    }
    const targets = resolveTargets(this.world, cmd.destination);
    if (targets.length === 0) {
      this.log(`${describeCommand(cmd)} sem alvo online (${cmd.destination})`);
      return;
    }
    for (const robot of targets) {
      if (!robot.appRunning) {
        this.log(`${describeCommand(cmd)} ignorado por ${robot.address} — app não está rodando (Bootloader)`);
        continue;
      }
      applyCommand(robot, cmd);
      this.log(`⇩ ${describeCommand(cmd)} aplicado em ${robot.address}`);
    }
  }

  private applySwarmitDownlink(cmd: SwarmitCommand): void {
    if (!this.swarmitOn) {
      this.log('comando swarmit ignorado (camada swarmit desligada)');
      return;
    }
    for (const robot of resolveTargets(this.world, cmd.destination)) {
      const device = this.swarmitDevices.get(robot.address);
      if (!device) continue;
      for (const payload of device.onCommand(cmd.payload)) {
        this.sendUplink({ kind: 'swarmit-data', source: robot.address, payload });
      }
    }
    this.syncAppRunning();
  }
}

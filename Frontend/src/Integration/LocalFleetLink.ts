import { INACTIVE_AFTER_S, LOST_AFTER_S } from '../Consts/SimulationConsts';
import { RobotStatus } from '../enums/RobotStatus.enum';
import { SimRobotMapper } from '../mapper/SimRobot.Mapper';
import type { SwarmitDeviceStatus } from '../enums/SwarmitDeviceStatus.enum';
import { SwarmitPayloadType } from '../enums/SwarmitPayloadType.enum';
import type { DotBotAdvertisement } from './Protocols/DotBot.Payload';
import { SWARMIT_OTA_CHUNK_SIZE, swarmitStatusName } from './Protocols/Swarmit/Swarmit.Protocol';
import { describeCommand } from './FleetLink';
import type { FleetCommand, FleetLink, FleetUplink } from './FleetLink';
import { LocalOrchestrator } from './LocalOrchestrator';

// Link OFFLINE (padrão enquanto não existe conexão com a API): um "backend
// de bolso" em memória no lugar do broker MQTT + NestJS. Faz o papel do
// control plane dos dois lados do contrato FleetLink:
//   - recebe os uplinks do gateway simulado e mantém a visão que o backend
//     teria de cada robô (último DOTBOT_ADVERTISEMENT, se está na rede Mari,
//     status swarmit) — inclusive os timers de envelhecimento que o
//     simulador deixa de propósito pro backend: Active (< 5 s sem
//     telemetria) → Inactive (5–60 s) → Lost (> 60 s), os mesmos de
//     src/enums/RobotStatus.enum.ts;
//   - manda os comandos que a tela dispara (joystick, modo, LED, swarmit),
//     que descem pelo modelo de rede como desceriam do backend;
//   - roda o orquestrador (LocalOrchestrator): tasks, modos Manual/SemiAuto/
//     Auto e a atribuição automática da fila, como o OrchestratorService.
// Tudo em TEMPO SIMULADO (relógio do World): pausar congela os timers.
// Quando a API existir, é trocar este link pelo MqttFleetLink em
// screens/Simulation/useSimulation.ts — o gateway, o motor e a tela não mudam.

const OTA_RETRY_S = 0.5;
const OTA_MAX_ROUNDS = 20;
const LOG_MAX = 150;

interface OtaState {
  total: number;
  acked: Set<number>;
  startAcked: boolean;
  lastSendAt: number;
  rounds: number;
}

export interface BackendRobotView {
  address: string;
  /** Recebeu NODE_JOINED (ou qualquer tráfego) e não recebeu NODE_LEFT depois. */
  inNetwork: boolean;
  advertisement: DotBotAdvertisement | null;
  lastAdvertisementAt: number | null;
  advertisements: number;
  swarmitStatus: SwarmitDeviceStatus | null;
  /** Progresso do flash visto pelo backend (chunks com ACK / total), ou null sem flash em andamento. */
  otaProgress: number | null;
}

export interface LinkLogEntry {
  id: number;
  t: number;
  source: 'gateway' | 'backend';
  text: string;
  /** Quantas mensagens iguais em sequência essa linha resume (fluxo do joystick). */
  count: number;
  /** Chave de agrupamento — só existe pras mensagens de fluxo (ver `streamKey`). */
  key?: string;
}

/** Quantas linhas pra trás procurar uma do mesmo fluxo (backend e gateway se alternam). */
const STREAM_LOOKBACK = 4;

/**
 * O joystick manda CMD_MOVE_RAW a 10 Hz — uma linha por mensagem afogaria o
 * log. Mensagens de fluxo (mesmo comando/alvo/desfecho, só os valores de
 * L/R mudando) viram UMA linha que se atualiza e conta as repetições.
 */
function streamKey(source: LinkLogEntry['source'], text: string): string | undefined {
  if (!text.includes('CMD_MOVE_RAW')) return undefined;
  return `${source}|${text.replace(/L=-?\d+ R=-?\d+/, 'L=# R=#')}`;
}

export interface LocalFleetLinkOptions {
  /** Relógio simulado (s) — normalmente `() => world.time`. */
  clock: () => number;
}

export class LocalFleetLink implements FleetLink {
  private readonly clock: () => number;
  private commandCb: ((cmd: FleetCommand) => void) | null = null;
  private started = false;
  private readonly views = new Map<string, BackendRobotView>();
  private readonly ota = new Map<string, OtaState>();
  private readonly lastStatus = new Map<string, RobotStatus>();
  private logEntries: LinkLogEntry[] = [];
  private logSeq = 0;

  /** Contadores de uplink por tipo (o que "chegou na API"). */
  readonly received: Record<FleetUplink['kind'], number> = {
    'gateway-info': 0,
    'node-joined': 0,
    'node-left': 0,
    'node-keep-alive': 0,
    'node-data': 0,
    'swarmit-data': 0,
  };
  lastGatewayInfoAt: number | null = null;

  /** Tasks + colunas mode/taskId dos robôs — o OrchestratorService do backend. */
  readonly orchestrator: LocalOrchestrator;

  constructor(opts: LocalFleetLinkOptions) {
    this.clock = opts.clock;
    this.orchestrator = new LocalOrchestrator({
      clock: () => this.clock(),
      send: (cmd) => this.send(cmd),
      log: (text) => this.log('backend', text),
      statusOf: (address) => this.statusOf(address),
    });
  }

  // ---- FleetLink ----------------------------------------------------------------

  start(): Promise<void> {
    this.started = true;
    this.log('backend', 'link local pronto — simulação 100% offline (sem API)');
    return Promise.resolve();
  }

  stop(): Promise<void> {
    this.started = false;
    return Promise.resolve();
  }

  onCommand(cb: (cmd: FleetCommand) => void): void {
    this.commandCb = cb;
  }

  publishUplink(uplink: FleetUplink): void {
    if (!this.started) return;
    this.received[uplink.kind]++;
    const now = this.clock();

    switch (uplink.kind) {
      case 'gateway-info':
        this.lastGatewayInfoAt = now;
        break;
      case 'node-joined':
        this.view(uplink.address).inNetwork = true;
        this.log('backend', `⇧ NODE_JOINED ${uplink.address}`);
        break;
      case 'node-left':
        this.view(uplink.address).inNetwork = false;
        this.log('backend', `⇧ NODE_LEFT ${uplink.address}`);
        break;
      case 'node-keep-alive':
        this.view(uplink.address).inNetwork = true;
        break;
      case 'node-data': {
        const v = this.view(uplink.source);
        if (v.advertisements === 0) this.log('backend', `primeiro DOTBOT_ADVERTISEMENT de ${uplink.source} — robô cadastrado`);
        v.inNetwork = true;
        v.advertisement = uplink.payload;
        v.lastAdvertisementAt = now;
        v.advertisements++;
        this.orchestrator.onAdvertisement(uplink.source, uplink.payload);
        break;
      }
      case 'swarmit-data':
        this.onSwarmitUplink(uplink.source, uplink.payload, now);
        break;
    }
  }

  // ---- Lado "backend": comandos -----------------------------------------------

  send(cmd: FleetCommand): void {
    if (!this.started || !this.commandCb) return;
    if (cmd.kind !== 'swarmit' || cmd.payload.type !== SwarmitPayloadType.SWARMIT_OTA_CHUNK) {
      this.log('backend', `⇩ ${describeCommand(cmd)} → ${cmd.destination}`);
    }
    this.commandCb(cmd);
  }

  /** Flash OTA simulado: OTA_START, e ao receber o ACK manda os chunks; reenvia os sem ACK a cada 0,5 s. */
  flash(address: string, chunkCount = 8): void {
    this.ota.set(address, { total: chunkCount, acked: new Set(), startAcked: false, lastSendAt: this.clock(), rounds: 0 });
    this.view(address).otaProgress = 0;
    this.send({
      kind: 'swarmit',
      destination: address,
      payload: { type: SwarmitPayloadType.SWARMIT_OTA_START, fw_length: chunkCount * SWARMIT_OTA_CHUNK_SIZE, fw_chunk_count: chunkCount },
    });
  }

  /** Chamado pelo loop da tela depois de cada lote de ticks: retransmissão do OTA, timers de status e rodada do orquestrador. */
  update(): void {
    const now = this.clock();

    for (const [address, st] of this.ota) {
      if (now - st.lastSendAt < OTA_RETRY_S) continue;
      if (st.rounds >= OTA_MAX_ROUNDS) {
        this.ota.delete(address);
        this.view(address).otaProgress = null;
        this.log('backend', `✕ flash de ${address} desistiu após ${OTA_MAX_ROUNDS} tentativas`);
        continue;
      }
      st.rounds++;
      st.lastSendAt = now;
      if (!st.startAcked) {
        this.send({
          kind: 'swarmit',
          destination: address,
          payload: { type: SwarmitPayloadType.SWARMIT_OTA_START, fw_length: st.total * SWARMIT_OTA_CHUNK_SIZE, fw_chunk_count: st.total },
        });
      } else {
        this.sendPendingChunks(address, st);
      }
    }

    for (const v of this.views.values()) {
      const status = this.statusOf(v.address, now);
      if (status === null) continue;
      const prev = this.lastStatus.get(v.address);
      if (prev !== undefined && prev !== status) {
        const why = status === RobotStatus.Active ? 'telemetria voltou' : `${status === RobotStatus.Inactive ? INACTIVE_AFTER_S : LOST_AFTER_S} s sem telemetria`;
        this.log('backend', `${status === RobotStatus.Active ? '✓' : '⚠'} ${v.address} → ${SimRobotMapper.statusLabel(status)} (${why})`);
        if (status === RobotStatus.Lost) this.orchestrator.onLost(v.address);
      }
      this.lastStatus.set(v.address, status);
    }

    this.orchestrator.update();
  }

  // ---- Leitura (UI) -------------------------------------------------------------

  getView(address: string): BackendRobotView | null {
    return this.views.get(address) ?? null;
  }

  /** Status que o backend calcularia por `lastSync` — null = nunca mandou telemetria (não cadastrado). */
  statusOf(address: string, now: number = this.clock()): RobotStatus | null {
    const last = this.views.get(address)?.lastAdvertisementAt;
    if (last === null || last === undefined) return null;
    const silence = now - last;
    if (silence < INACTIVE_AFTER_S) return RobotStatus.Active;
    if (silence < LOST_AFTER_S) return RobotStatus.Inactive;
    return RobotStatus.Lost;
  }

  /** Log (mais recente primeiro) — gateway + backend de bolso. */
  get entries(): readonly LinkLogEntry[] {
    return this.logEntries;
  }

  log(source: LinkLogEntry['source'], text: string): void {
    const key = streamKey(source, text);
    const t = this.clock();
    if (key) {
      const k = this.logEntries.findIndex((e, i) => i < STREAM_LOOKBACK && e.key === key);
      if (k >= 0) {
        const prev = this.logEntries[k];
        const merged: LinkLogEntry = { ...prev, id: ++this.logSeq, t, text, count: prev.count + 1 };
        this.logEntries = [merged, ...this.logEntries.filter((_, i) => i !== k)];
        return;
      }
    }
    this.logEntries = [{ id: ++this.logSeq, t, source, text, count: 1, key }, ...this.logEntries].slice(0, LOG_MAX);
  }

  // ---- internos -----------------------------------------------------------------

  private view(address: string): BackendRobotView {
    let v = this.views.get(address);
    if (!v) {
      v = {
        address,
        inNetwork: false,
        advertisement: null,
        lastAdvertisementAt: null,
        advertisements: 0,
        swarmitStatus: null,
        otaProgress: null,
      };
      this.views.set(address, v);
    }
    return v;
  }

  private onSwarmitUplink(address: string, payload: Extract<FleetUplink, { kind: 'swarmit-data' }>['payload'], now: number): void {
    const v = this.view(address);
    const st = this.ota.get(address);
    switch (payload.type) {
      case SwarmitPayloadType.SWARMIT_STATUS:
        if (payload.status !== undefined && payload.status !== v.swarmitStatus) {
          this.log('backend', `SWARMIT_STATUS ${address}: ${swarmitStatusName(payload.status)}`);
          v.swarmitStatus = payload.status;
        }
        break;
      case SwarmitPayloadType.SWARMIT_OTA_START_ACK:
        if (st && !st.startAcked) {
          st.startAcked = true;
          st.lastSendAt = now;
          this.sendPendingChunks(address, st);
        }
        break;
      case SwarmitPayloadType.SWARMIT_OTA_CHUNK_ACK:
        if (st) {
          st.acked.add(payload.index);
          v.otaProgress = st.acked.size / st.total;
          if (st.acked.size >= st.total) {
            this.ota.delete(address);
            v.otaProgress = null;
            this.log('backend', `flash de ${address} concluído (${st.total} chunks, ${st.rounds} reenvio(s)) — falta o START`);
          }
        }
        break;
      default:
        break;
    }
  }

  private sendPendingChunks(address: string, st: OtaState): void {
    for (let index = 0; index < st.total; index++) {
      if (st.acked.has(index)) continue;
      this.send({ kind: 'swarmit', destination: address, payload: { type: SwarmitPayloadType.SWARMIT_OTA_CHUNK, index } });
    }
  }
}

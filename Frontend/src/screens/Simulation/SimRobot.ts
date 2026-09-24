import { MAX_WHEEL_SPEED_MM_S, PWM_MAX, WHEEL_BASE_MM } from '../../Consts/SimulationConsts';
import { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import { RobotApplication } from '../../enums/RobotApplication.enum';
import type { RgbColorModel, SimRobotModel } from '../../model/SimRobot.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';

// Robô simulado — porte do RobotSwarmSimulator (src/core/Robot.ts).
// Cinemática SIMPLES de tração diferencial (constantes em
// Consts/SimulationConsts.ts): fidelidade funcional (o que o backend
// observa), não física realista. Unidades: mm e radianos.

/** Normaliza um ângulo para (-PI, PI]. */
export function normalizeAngle(a: number): number {
  let r = a % (2 * Math.PI);
  if (r > Math.PI) r -= 2 * Math.PI;
  if (r <= -Math.PI) r += 2 * Math.PI;
  return r;
}

function clampPwm(v: number): number {
  return Math.max(-PWM_MAX, Math.min(PWM_MAX, Math.round(v)));
}

export interface RobotInit {
  address: string;
  application?: RobotApplication;
  mode?: DotBotControlMode;
  x: number; // mm
  y: number; // mm
  theta: number; // rad
  battery?: number;
}

export class SimRobot {
  readonly address: string;
  application: RobotApplication;
  mode: DotBotControlMode;

  // Liveness: o robô fica OFFLINE por (a) bateria chegar a 0 ou (b) falha
  // injetada (setOnline(false)). Offline = fora da rede Mari: o gateway para
  // de emitir advertise/keep-alive dele e emite NODE_LEFT uma vez.
  // FRONTEIRA COM O BACKEND: os timers ACTIVE → INACTIVE (5 s) → LOST (60 s)
  // são do backend — aqui só existe o GATILHO (o robô some/volta). Offline,
  // o "backend de bolso" (Integration/LocalFleetLink.ts) é quem aplica esses timers.
  private faultOffline = false;

  /**
   * App DotBot rodando. Com a camada swarmit ligada, o robô boota no
   * bootloader e só roda a aplicação depois de um START — igual ao hardware
   * (ver SimGateway.ts). Parado aqui = motores desligados e sem controlador AUTO.
   */
  appRunning = true;

  pos_x: number;
  pos_y: number;
  theta: number; // rad

  pwm_left = 0;
  pwm_right = 0;
  encoder_left = 0;
  encoder_right = 0;
  battery: number; // 0..100
  rgb: RgbColorModel = { r: 0, g: 0, b: 0 };

  waypoints: Vec2Model[] = [];
  waypoint_idx = 0;
  waypoint_threshold = 0; // mm
  /** Rota em LOOP: ao alcançar o último waypoint, volta ao 0. */
  loop = false;

  constructor(init: RobotInit) {
    this.address = init.address;
    this.application = init.application ?? RobotApplication.DotBot;
    this.mode = init.mode ?? DotBotControlMode.Manual;
    this.pos_x = init.x;
    this.pos_y = init.y;
    this.theta = normalizeAngle(init.theta);
    this.battery = init.battery ?? 100;
  }

  /** true quando o robô está na rede: bateria > 0 E sem falha injetada. */
  get online(): boolean {
    return !this.faultOffline && this.battery > 0;
  }

  /** Injeção de falha: derruba (false) / religa (true). Religar NÃO ressuscita bateria zerada. */
  setOnline(v: boolean): void {
    this.faultOffline = !v;
  }

  /** CMD_MOVE_RAW (0x00): entra em MANUAL; left_y/right_y viram os PWMs das
   *  rodas (left_x/right_x são ignorados, como no firmware de tração diferencial). */
  applyMoveRaw(_left_x: number, left_y: number, _right_x: number, right_y: number): void {
    this.mode = DotBotControlMode.Manual;
    this.pwm_left = clampPwm(left_y);
    this.pwm_right = clampPwm(right_y);
  }

  /** LH2_WAYPOINTS (0x08): carrega a rota e entra em AUTO. */
  setWaypoints(list: Vec2Model[], threshold: number): void {
    this.mode = DotBotControlMode.Auto;
    this.waypoints = list.map((p) => ({ x: p.x, y: p.y }));
    this.waypoint_idx = 0;
    this.waypoint_threshold = threshold;
  }

  /** CMD_RGB_LED (0x01). */
  setRgb(r: number, g: number, b: number): void {
    this.rgb = { r, g, b };
  }

  /** CONTROL_MODE (0x07). Trocar de modo para o robô até o próximo comando. */
  setMode(mode: DotBotControlMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.pwm_left = 0;
    this.pwm_right = 0;
  }

  /** Integra dt segundos: pwm → velocidade de roda → pose + encoders + bateria.
   *  A colisão é resolvida depois, pelo SimWorld. */
  step(dt: number, batteryDrainPerMin: number): void {
    if (this.battery <= 0 || !this.appRunning) {
      // sem bateria (ou sem aplicação rodando), o robô não se move
      this.pwm_left = 0;
      this.pwm_right = 0;
    }

    const vl = (this.pwm_left / PWM_MAX) * MAX_WHEEL_SPEED_MM_S;
    const vr = (this.pwm_right / PWM_MAX) * MAX_WHEEL_SPEED_MM_S;
    const v = (vl + vr) / 2;
    const w = (vr - vl) / WHEEL_BASE_MM;

    this.pos_x += v * Math.cos(this.theta) * dt;
    this.pos_y += v * Math.sin(this.theta) * dt;
    this.theta = normalizeAngle(this.theta + w * dt);

    this.encoder_left += vl * dt;
    this.encoder_right += vr * dt;

    this.battery = Math.max(0, this.battery - (batteryDrainPerMin * dt) / 60);
  }

  snapshot(): SimRobotModel {
    return {
      address: this.address,
      application: this.application,
      mode: this.mode,
      online: this.online,
      appRunning: this.appRunning,
      loop: this.loop,
      pos_x: this.pos_x,
      pos_y: this.pos_y,
      theta: this.theta,
      pwm_left: this.pwm_left,
      pwm_right: this.pwm_right,
      encoder_left: this.encoder_left,
      encoder_right: this.encoder_right,
      battery: this.battery,
      rgb: { ...this.rgb },
      waypoints: this.waypoints.map((p) => ({ ...p })),
      waypoint_idx: this.waypoint_idx,
      waypoint_threshold: this.waypoint_threshold,
    };
  }
}

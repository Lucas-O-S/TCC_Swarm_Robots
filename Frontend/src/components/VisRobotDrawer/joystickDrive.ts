import { DEG_TO_RAD, PWM_MAX, RAD_TO_DEG } from '../../Consts/SimulationConsts';
import { clamp } from '../../screens/Simulation/SimPhysics';
import { normalizeAngle } from '../../screens/Simulation/SimRobot';

// Controlador do joystick "de jogo" do Visualizador — CÓPIA do que está no
// SimRobotDrawer (mesmos ganhos, mesma regra), pra dirigir o robô real do
// mesmo jeito que a Simulação dirige o simulado. Unificar os dois num lugar
// só é uma limpeza pendente (ver AGENTS.md do front).

/** Giro automático: PWM de diferença entre as rodas por rad de erro de rumo. */
const HEADING_KP = 40;
/** Teto do PWM de giro — mais que isso o robô passa do rumo entre dois comandos (20 Hz). */
const TURN_PWM_MAX = 50;
/** cos(60°): com o rumo fora desse cone o robô só gira no lugar; dentro, anda e vai corrigindo. */
const DRIVE_CONE_COS = 0.5;
/** Perto de 180° o erro troca de sinal à toa — nessa zona mantém o lado do giro que já estava. */
const FLIP_ZONE_RAD = 150 * DEG_TO_RAD;

export interface DriveCommand {
  left: number;
  right: number;
  /** Rumo pedido no mapa, em graus (0° = direita, 90° = pra cima — mesma convenção do theta). */
  headingDeg: number;
  /** Lado do giro (+1 anti-horário, -1 horário, 0 alinhado) — vira o `keepSide` do próximo comando. */
  side: number;
}

/**
 * Manche → CMD_MOVE_RAW com giro automático: a direção do manche é a direção
 * no MAPA pra onde o robô deve ir (pra cima = +Y do mundo). A partir do
 * theta atual (no Visualizador, o `direction` da telemetria) calcula o erro
 * de rumo, gira as rodas em sentidos opostos até apontar pra lá e, dentro do
 * cone de 60°, soma o avanço. Saída: PWM das duas rodas (int8, ±127).
 */
export function joystickToWheels(x: number, y: number, theta: number, maxPwm: number, keepSide: number): DriveCommand {
  const mag = Math.min(1, Math.hypot(x, y));
  const heading = Math.atan2(y, x);
  if (mag === 0) return { left: 0, right: 0, headingDeg: 0, side: 0 };

  let err = normalizeAngle(heading - theta);
  if (keepSide !== 0 && Math.abs(err) > FLIP_ZONE_RAD && Math.sign(err) !== keepSide) {
    err -= Math.sign(err) * 2 * Math.PI; // mesmo rumo, pelo lado que já estava girando
  }

  const turnMax = Math.min(TURN_PWM_MAX, maxPwm);
  const turn = clamp(HEADING_KP * err, -turnMax, turnMax); // > 0 = anti-horário = roda direita mais rápida
  const aligned = clamp((Math.cos(err) - DRIVE_CONE_COS) / (1 - DRIVE_CONE_COS), 0, 1);
  const forward = Math.min(mag * maxPwm * aligned, PWM_MAX - Math.abs(turn));

  return {
    left: Math.round(forward - turn),
    right: Math.round(forward + turn),
    headingDeg: ((heading * RAD_TO_DEG) % 360 + 360) % 360,
    side: turn === 0 ? keepSide : Math.sign(turn),
  };
}

import { ControlModeType } from '../protocol/enums';
import type { Obstacle, SimRobotState } from './types';

// Cinemática simplificada de tração diferencial — baixa fidelidade de
// propósito (ver SIMULADOR_PLANO.md, seção 5.1): o objetivo é exercitar o
// protocolo e o comportamento ponta a ponta, não simular física realista.
const MAX_SPEED_MM_S = 300;
const AUTO_SPEED_MM_S = 200;
const TURN_RATE_DEG_S = 90;
const WAYPOINT_THRESHOLD_MM = 40;
const BATTERY_DRAIN_PERCENT_PER_MIN = 0.6;

function clampPwm(value: number): number {
  return Math.max(-100, Math.min(100, value));
}

function normalizeDeg(deg: number): number {
  let normalized = deg % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
}

function collides(x: number, y: number, obstacles: Obstacle[]): boolean {
  return obstacles.some((o) => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h);
}

function moveForward(robot: SimRobotState, distanceMm: number, obstacles: Obstacle[]): void {
  const rad = (robot.theta * Math.PI) / 180;
  const nextX = robot.posX + distanceMm * Math.cos(rad);
  const nextY = robot.posY + distanceMm * Math.sin(rad);
  // Colisão de baixa fidelidade: bloqueia o movimento inteiro no tick em vez
  // de deslizar ao longo do obstáculo.
  if (!collides(nextX, nextY, obstacles)) {
    robot.posX = nextX;
    robot.posY = nextY;
  }
}

function stepManual(robot: SimRobotState, dt: number, obstacles: Obstacle[]): void {
  const left = clampPwm(robot.pwmLeft);
  const right = clampPwm(robot.pwmRight);
  const speed = ((left + right) / 2 / 100) * MAX_SPEED_MM_S;
  const turnRate = ((right - left) / 100) * TURN_RATE_DEG_S;

  robot.theta = normalizeDeg(robot.theta + turnRate * dt);
  moveForward(robot, speed * dt, obstacles);
}

function stepAuto(robot: SimRobotState, dt: number, obstacles: Obstacle[]): void {
  const target = robot.waypoints[robot.waypointIdx];
  if (!target) return;

  const dx = target.x - robot.posX;
  const dy = target.y - robot.posY;
  const distance = Math.hypot(dx, dy);

  if (distance <= WAYPOINT_THRESHOLD_MM) {
    // Modo AUTO cíclico: ao chegar no último ponto, volta pro primeiro.
    robot.waypointIdx = (robot.waypointIdx + 1) % robot.waypoints.length;
    return;
  }

  robot.theta = normalizeDeg((Math.atan2(dy, dx) * 180) / Math.PI);
  moveForward(robot, Math.min(AUTO_SPEED_MM_S * dt, distance), obstacles);
}

// Avança um robô em `dt` segundos (chamado pelo World a cada tick).
export function stepRobot(robot: SimRobotState, dt: number, obstacles: Obstacle[]): void {
  if (robot.mode === ControlModeType.Manual) {
    stepManual(robot, dt, obstacles);
  } else {
    stepAuto(robot, dt, obstacles);
  }

  robot.battery = Math.max(0, robot.battery - (BATTERY_DRAIN_PERCENT_PER_MIN / 60) * dt);
}

import { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import { normalizeAngle } from './SimRobot';
import type { SimRobot } from './SimRobot';

// Controlador de rota do modo AUTO — porte do RobotSwarmSimulator
// (src/core/waypoints.ts): gira em direção ao waypoint atual e avança;
// dentro do threshold, incrementa waypoint_idx. No fim da lista, sem loop o
// robô PARA de forma estável; com loop, waypoint_idx volta a 0.

const ANGLE_TOLERANCE_RAD = 0.15; // ~8.6° — acima disso, gira no lugar
const TURN_PWM_MAX = 60;
const FORWARD_PWM = 100;
const K_TURN = 200; // ganho proporcional (pwm por rad de erro)

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Um passo do controlador AUTO, escrevendo direto nos PWMs. */
export function applyWaypointController(robot: SimRobot): void {
  if (robot.mode !== DotBotControlMode.Auto || !robot.appRunning) return;

  const wps = robot.waypoints;
  const len = wps.length;

  // Consome no MESMO tick todos os waypoints já dentro do threshold (sem 1
  // tick de deriva entre um alvo e o próximo). O limite de `len` saltos
  // evita loop infinito numa rota em loop com todos os pontos no raio.
  for (let hops = 0; hops <= len; hops++) {
    const target = wps[robot.waypoint_idx];
    if (!target) break;

    const dx = target.x - robot.pos_x;
    const dy = target.y - robot.pos_y;
    const dist = Math.hypot(dx, dy);

    if (dist > robot.waypoint_threshold) {
      const desired = Math.atan2(dy, dx);
      const err = normalizeAngle(desired - robot.theta);
      if (Math.abs(err) > ANGLE_TOLERANCE_RAD) {
        const turn = clamp(K_TURN * err, -TURN_PWM_MAX, TURN_PWM_MAX);
        robot.pwm_left = Math.round(-turn);
        robot.pwm_right = Math.round(turn);
      } else {
        const corr = clamp(K_TURN * err, -20, 20);
        robot.pwm_left = Math.round(clamp(FORWARD_PWM - corr, -127, 127));
        robot.pwm_right = Math.round(clamp(FORWARD_PWM + corr, -127, 127));
      }
      return;
    }

    robot.waypoint_idx = robot.loop ? (robot.waypoint_idx + 1) % len : robot.waypoint_idx + 1;
  }

  // Rota concluída, vazia ou degenerada: para.
  robot.pwm_left = 0;
  robot.pwm_right = 0;
}

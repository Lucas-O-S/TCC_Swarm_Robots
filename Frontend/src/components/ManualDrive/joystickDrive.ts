import { PWM_MAX } from '../../Consts/SimulationConsts';
import { clamp } from '../../screens/Simulation/Service/SimPhysics';

// Mistura do joystick do ManualDrive — a mesma na Simulação (robô simulado)
// e no Visualizador (robô da API).

/** Quanto o eixo lateral do manche pesa na diferença entre as rodas (1 = gira no lugar a toda). */
const TURN_GAIN = 0.5;

export interface DriveCommand {
  left: number;
  right: number;
}

/**
 * Manche (x, y ∈ [-1, 1], y pra cima) → PWM das duas rodas — mistura
 * "arcade" de tração diferencial: pra frente soma nas duas rodas, pro lado
 * soma numa e tira da outra (direita = roda esquerda mais rápida = gira no
 * sentido horário). Normaliza pra nenhuma roda passar de ±1 e escala pela
 * velocidade máxima escolhida (int8 do CMD_MOVE_RAW, ±127).
 */
export function joystickToWheels(x: number, y: number, maxPwm: number): DriveCommand {
  const left = y + TURN_GAIN * x;
  const right = y - TURN_GAIN * x;
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  const toPwm = (v: number) => clamp(Math.round((v / scale) * maxPwm), -PWM_MAX, PWM_MAX);
  return { left: toPwm(left), right: toPwm(right) };
}

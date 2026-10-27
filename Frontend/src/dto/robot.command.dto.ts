import { z } from 'zod';
import { RobotControlMode } from '../enums/RobotControlMode.enum';
import { enumValueSchema } from './enumSchema';

/**
 * Corpos dos comandos `PUT /robots/:address/<comando>` — espelham os DTOs de
 * `src/Classes/Robots/DTO/*.ts` do backend.
 */

const int8 = (field: string) =>
  z
    .number({ required_error: `${field} deve ser um número inteiro` })
    .int(`${field} deve ser um número inteiro`)
    .min(-128, `${field} deve ser no mínimo -128`)
    .max(127, `${field} deve ser no máximo 127`);

const byte = (field: string) =>
  z
    .number({ required_error: `${field} deve ser um número inteiro` })
    .int(`${field} deve ser um número inteiro`)
    .min(0, `${field} deve ser no mínimo 0`)
    .max(255, `${field} deve ser no máximo 255`);

/** `move-raw`: joystick. Cada eixo é um int8 (-128 a 127). */
export const robotMoveRawRequestSchema = z.object({
  left_x: int8('left_x'),
  left_y: int8('left_y'),
  right_x: int8('right_x'),
  right_y: int8('right_y'),
});
export type RobotMoveRawRequest = z.infer<typeof robotMoveRawRequestSchema>;

/** `rgb-led`: cada canal é um byte (0 a 255). */
export const robotRgbLedRequestSchema = z.object({
  red: byte('red'),
  green: byte('green'),
  blue: byte('blue'),
});
export type RobotRgbLedRequest = z.infer<typeof robotRgbLedRequestSchema>;

/** `control-mode`: 0 (Manual), 1 (Auto) ou 2 (SemiAuto). */
export const robotControlModeRequestSchema = z.object({
  mode: enumValueSchema(RobotControlMode, 'mode deve ser 0 (Manual), 1 (Auto) ou 2 (SemiAuto)'),
});
export type RobotControlModeRequest = z.infer<typeof robotControlModeRequestSchema>;

/** Um ponto de destino LH2, em mm. */
export const robotWaypointPointSchema = z.object({
  x: z.number().int('x deve ser um número inteiro').min(0, 'x deve ser no mínimo 0'),
  y: z.number().int('y deve ser um número inteiro').min(0, 'y deve ser no mínimo 0'),
});

/** `waypoints`: distância de chegada + lista de pontos (pelo menos 1). */
export const robotWaypointsRequestSchema = z.object({
  threshold: z.number().int('threshold deve ser um número inteiro').min(0, 'threshold deve ser no mínimo 0'),
  waypoints: z.array(robotWaypointPointSchema).min(1, 'waypoints deve ter pelo menos um ponto'),
});
export type RobotWaypointsRequest = z.infer<typeof robotWaypointsRequestSchema>;

/** `xgo-action`: código da ação (0 a 255). Só robôs XGO. */
export const robotXgoActionRequestSchema = z.object({
  action: byte('action'),
});
export type RobotXgoActionRequest = z.infer<typeof robotXgoActionRequestSchema>;

/**
 * Recibo devolvido por TODOS os comandos (`RobotService.sendCommand` no
 * backend): `{ address, command, payload }`. `command` fica `string` (e não
 * a união dos 5 comandos) pra uma resposta com comando novo não ser rejeitada.
 */
export const robotCommandReceiptSchema = z.object({
  address: z.string(),
  command: z.string(),
  payload: z.record(z.string(), z.unknown()),
});
export type RobotCommandReceiptDto = z.infer<typeof robotCommandReceiptSchema>;

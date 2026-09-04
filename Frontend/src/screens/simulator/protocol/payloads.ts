/**
 * (De)codificação dos payloads DotBot que o simulador realmente troca:
 * consome CMD_MOVE_RAW / CONTROL_MODE / LH2_WAYPOINTS / CMD_RGB_LED (saem do
 * backend) e produz DOTBOT_SIMULATOR_DATA (a pose enxuta que o protocolo
 * reserva pro simulador — ver SIMULADOR_PLANO.md, seção 6).
 *
 * As larguras de campo abaixo seguem o formato descrito em AGENTS.md; se o
 * backend real (`src/Protocols/Wrappers/`) usar larguras diferentes pra
 * algum campo, ajustar aqui é a única mudança necessária — todo o resto
 * (World, UI) trabalha só com os valores já decodificados.
 */

import type { FieldSpec } from './codec';
import { decodeFields, encodeFields } from './codec';
import { PayloadType } from './enums';

// ---- Produz: DOTBOT_SIMULATOR_DATA (pose) ---------------------------------

const SIMULATOR_DATA_FIELDS: FieldSpec[] = [
  { name: 'theta', length: 2, signed: true },
  { name: 'posX', length: 4, signed: true },
  { name: 'posY', length: 4, signed: true },
];

/** Monta o "DotBot Packet" completo (payloadType + body) pronto pra virar o payload de um Mari frame. */
export function encodeSimulatorData(theta: number, posX: number, posY: number): Uint8Array {
  const body = encodeFields(SIMULATOR_DATA_FIELDS, {
    theta: Math.round(theta),
    posX: Math.round(posX),
    posY: Math.round(posY),
  });
  return Uint8Array.from([PayloadType.DOTBOT_SIMULATOR_DATA, ...body]);
}

// ---- Consome: CMD_MOVE_RAW -------------------------------------------------

const MOVE_RAW_FIELDS: FieldSpec[] = [
  { name: 'leftX', length: 2, signed: true },
  { name: 'leftY', length: 2, signed: true },
  { name: 'rightX', length: 2, signed: true },
  { name: 'rightY', length: 2, signed: true },
];

export interface MoveRawCommand {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
}

export function decodeMoveRaw(body: Uint8Array): MoveRawCommand {
  return decodeFields(MOVE_RAW_FIELDS, body) as unknown as MoveRawCommand;
}

// ---- Consome: CMD_RGB_LED ---------------------------------------------------

const RGB_LED_FIELDS: FieldSpec[] = [
  { name: 'red', length: 1 },
  { name: 'green', length: 1 },
  { name: 'blue', length: 1 },
];

export interface RgbLedCommand {
  red: number;
  green: number;
  blue: number;
}

export function decodeRgbLed(body: Uint8Array): RgbLedCommand {
  return decodeFields(RGB_LED_FIELDS, body) as unknown as RgbLedCommand;
}

// ---- Consome: CONTROL_MODE --------------------------------------------------

const CONTROL_MODE_FIELDS: FieldSpec[] = [{ name: 'mode', length: 1 }];

export function decodeControlMode(body: Uint8Array): number {
  return decodeFields(CONTROL_MODE_FIELDS, body).mode;
}

// ---- Consome: LH2_WAYPOINTS (tamanho variável) ------------------------------
// threshold(1B) + count(1B) + N pontos de {x:int32, y:int32}. Tamanho
// variável — por isso é composto na mão em vez de virar mais uma FieldSpec
// no motor genérico (mesma decisão do backend, ver AGENTS.md).

const WAYPOINT_POINT_FIELDS: FieldSpec[] = [
  { name: 'x', length: 4, signed: true },
  { name: 'y', length: 4, signed: true },
];

export interface WaypointsCommand {
  threshold: number;
  points: { x: number; y: number }[];
}

export function decodeWaypoints(body: Uint8Array): WaypointsCommand {
  const threshold = body[0];
  const count = body[1];
  const points: { x: number; y: number }[] = [];

  let offset = 2;
  for (let i = 0; i < count; i++) {
    const point = decodeFields(WAYPOINT_POINT_FIELDS, body, offset);
    points.push({ x: point.x, y: point.y });
    offset += 8;
  }

  return { threshold, points };
}

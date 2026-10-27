/**
 * (De)codificação dos payloads DotBot usados na borda MQTT do simulador
 * (Integration/MqttFleetLink.ts) — em cima do motor de campos de
 * `Protocol.Codec.ts`. Espelha `src/Protocols/Wrappers/` do backend.
 *
 * CORRIGIDO (2026-09-23): as larguras antigas daqui divergiam do backend e do
 * PyDotBot — CMD_MOVE_RAW usava int16 por eixo (o certo é int8), o
 * threshold do LH2_WAYPOINTS usava 1 byte (o certo é u16) e os pontos eram
 * int32 com sinal (o certo é u32). Agora batem com
 * `Backend/server/src/Protocols/Wrappers/Encode/*.wrapper.ts` e com o
 * `src/protocol/dotbot.ts` do RobotSwarmSimulator (validado byte a byte
 * contra o dotbot/protocol.py). Todos os inteiros são LITTLE-ENDIAN.
 *
 * O "DotBot Packet" que entra como payload do frame Mari é
 * `[1 B payload_type] + campos`.
 */

import { PayloadType } from '../../enums/PayloadType.enum';
import type { FieldSpec } from './Protocol.Codec';
import { decodeFields, encodeFields } from './Protocol.Codec';
import { addressToBytes } from './Mari/Mari.Protocol';

/** Bateria % → mV (u16): rampa 0% = 3000 mV … 100% = 4200 mV — o backend divide por 1000 pra exibir volts. */
export function batteryToMillivolts(percent: number): number {
  const p = Math.min(100, Math.max(0, percent));
  return Math.round(3000 + (p / 100) * 1200);
}

function packet(type: number, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(body.length + 1);
  out[0] = type;
  out.set(body, 1);
  return out;
}

// ---- Produz: DOTBOT_ADVERTISEMENT 0x06 (telemetria, 33 B de campos) ---------

export interface DotBotAdvertisement {
  calibrated: number; // u8 (bitmask LH1=0x01, LH2=0x02)
  direction: number; // i16, graus [0, 360)
  pos_x: number; // u32, mm
  pos_y: number; // u32, mm
  battery: number; // u16, mV
  pwm_left: number; // i8
  pwm_right: number; // i8
  mode: number; // u8 (DotBotControlMode — Manual=0, Auto=1)
  encoder_left: number; // i32
  encoder_right: number; // i32
  waypoint_x: number; // u32
  waypoint_y: number; // u32
  waypoint_idx: number; // u8
}

const ADVERTISEMENT_FIELDS: FieldSpec[] = [
  { name: 'calibrated', length: 1 },
  { name: 'direction', length: 2, signed: true },
  { name: 'pos_x', length: 4 },
  { name: 'pos_y', length: 4 },
  { name: 'battery', length: 2 },
  { name: 'pwm_left', length: 1, signed: true },
  { name: 'pwm_right', length: 1, signed: true },
  { name: 'mode', length: 1 },
  { name: 'encoder_left', length: 4, signed: true },
  { name: 'encoder_right', length: 4, signed: true },
  { name: 'waypoint_x', length: 4 },
  { name: 'waypoint_y', length: 4 },
  { name: 'waypoint_idx', length: 1 },
];

export function encodeDotBotAdvertisement(adv: DotBotAdvertisement): Uint8Array {
  return packet(PayloadType.DOTBOT_ADVERTISEMENT, encodeFields(ADVERTISEMENT_FIELDS, { ...adv }));
}

export function decodeDotBotAdvertisement(body: Uint8Array): DotBotAdvertisement {
  return decodeFields(ADVERTISEMENT_FIELDS, body) as unknown as DotBotAdvertisement;
}

// ---- Produz: DOTBOT_SIMULATOR_DATA 0xFA (pose enxuta) -----------------------

const SIMULATOR_DATA_FIELDS: FieldSpec[] = [
  { name: 'theta', length: 2 },
  { name: 'posX', length: 4 },
  { name: 'posY', length: 4 },
];

export function encodeSimulatorData(thetaDeg: number, posX: number, posY: number): Uint8Array {
  const body = encodeFields(SIMULATOR_DATA_FIELDS, {
    theta: ((Math.round(thetaDeg) % 360) + 360) % 360,
    posX: Math.max(0, Math.round(posX)),
    posY: Math.max(0, Math.round(posY)),
  });
  return packet(PayloadType.DOTBOT_SIMULATOR_DATA, body);
}

// ---- Consome: CMD_MOVE_RAW 0x00 — 4× int8 -----------------------------------

const MOVE_RAW_FIELDS: FieldSpec[] = [
  { name: 'leftX', length: 1, signed: true },
  { name: 'leftY', length: 1, signed: true },
  { name: 'rightX', length: 1, signed: true },
  { name: 'rightY', length: 1, signed: true },
];

export interface MoveRawFields {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
}

export function decodeMoveRaw(body: Uint8Array): MoveRawFields {
  return decodeFields(MOVE_RAW_FIELDS, body) as unknown as MoveRawFields;
}

// ---- Consome: CMD_RGB_LED 0x01 — 3× u8 ----------------------------------------

const RGB_LED_FIELDS: FieldSpec[] = [
  { name: 'red', length: 1 },
  { name: 'green', length: 1 },
  { name: 'blue', length: 1 },
];

export interface RgbLedFields {
  red: number;
  green: number;
  blue: number;
}

export function decodeRgbLed(body: Uint8Array): RgbLedFields {
  return decodeFields(RGB_LED_FIELDS, body) as unknown as RgbLedFields;
}

// ---- Consome: CONTROL_MODE 0x07 — 1× u8 -------------------------------------

export function decodeControlMode(body: Uint8Array): number {
  return decodeFields([{ name: 'mode', length: 1 }], body).mode;
}

// ---- Consome: LH2_WAYPOINTS 0x08 — threshold u16 + count u8 + N×(u32, u32) ---

const WAYPOINT_POINT_FIELDS: FieldSpec[] = [
  { name: 'x', length: 4 },
  { name: 'y', length: 4 },
];

export interface WaypointsFields {
  threshold: number;
  points: { x: number; y: number }[];
}

export function decodeWaypoints(body: Uint8Array): WaypointsFields {
  const { threshold, count } = decodeFields(
    [
      { name: 'threshold', length: 2 },
      { name: 'count', length: 1 },
    ],
    body,
  );
  const points: { x: number; y: number }[] = [];
  let offset = 3;
  for (let i = 0; i < count; i++) {
    const point = decodeFields(WAYPOINT_POINT_FIELDS, body, offset);
    points.push({ x: point.x, y: point.y });
    offset += 8;
  }
  return { threshold, points };
}

// ---- Eventos de borda do gateway (sem frame Mari) ---------------------------

/** NodeInfoCloud — dado de NODE_JOINED/LEFT/KEEP_ALIVE: address u64 + gateway_address u64 (16 B). */
export function encodeNodeInfoCloud(address: string, gatewayAddress: string): Uint8Array {
  const out = new Uint8Array(16);
  out.set(addressToBytes(address), 0);
  out.set(addressToBytes(gatewayAddress), 8);
  return out;
}

/**
 * GatewayInfo — dado de GATEWAY_INFO (55 B): address u64 + network_id u16 +
 * schedule_id u8 + schedule_stats 32 B + asn u64 + timer u32.
 */
export function encodeGatewayInfo(gatewayAddress: string, networkId: number, asn: bigint, timerMs: number): Uint8Array {
  const out = new Uint8Array(55);
  const view = new DataView(out.buffer);
  out.set(addressToBytes(gatewayAddress), 0);
  view.setUint16(8, networkId & 0xffff, true);
  view.setUint8(10, 0); // schedule_id — sem semântica no simulador
  // [11..42] schedule_stats: zeros
  view.setBigUint64(43, asn, true);
  view.setUint32(51, Math.min(0xffffffff, Math.max(0, Math.round(timerMs))), true);
  return out;
}

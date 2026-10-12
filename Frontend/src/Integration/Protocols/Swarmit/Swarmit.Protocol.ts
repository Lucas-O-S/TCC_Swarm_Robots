import { SwarmitDeviceStatus } from '../../../enums/SwarmitDeviceStatus.enum';
import type { SwarmitDeviceType } from '../../../enums/SwarmitDeviceStatus.enum';
import type { SwarmitPayloadType } from '../../../enums/SwarmitPayloadType.enum';

// Payloads da camada swarmit (orquestração do testbed) — espelha
// `src/Protocols/Swarmit/` do backend e o swarmit/testbed/protocol.py. Por
// enquanto só os TIPOS: offline não há bytes trafegando (o LocalFleetLink
// passa objetos neutros), e o backend ainda filtra next_proto = DOTBOT_APP,
// então o codec binário fica pra quando o MqttFleetLink for ligado.

export const SWARMIT_OTA_CHUNK_SIZE = 128;

type T = typeof SwarmitPayloadType;

export type SwarmitPayload =
  | {
      type: T['SWARMIT_STATUS'];
      /** Presentes só no heartbeat que SOBE — descendo, STATUS é um request vazio. */
      device?: SwarmitDeviceType;
      status?: SwarmitDeviceStatus;
      battery?: number; // mV
      pos_x?: number;
      pos_y?: number;
    }
  | { type: T['SWARMIT_START'] }
  | { type: T['SWARMIT_STOP'] }
  | { type: T['SWARMIT_RESET']; pos_x: number; pos_y: number }
  | { type: T['SWARMIT_OTA_START']; fw_length: number; fw_chunk_count: number }
  | { type: T['SWARMIT_OTA_CHUNK']; index: number }
  | { type: T['SWARMIT_OTA_START_ACK'] }
  | { type: T['SWARMIT_OTA_CHUNK_ACK']; index: number };

const STATUS_NAMES: Record<SwarmitDeviceStatus, string> = {
  [SwarmitDeviceStatus.Bootloader]: 'Bootloader',
  [SwarmitDeviceStatus.Running]: 'Running',
  [SwarmitDeviceStatus.Stopping]: 'Stopping',
  [SwarmitDeviceStatus.Resetting]: 'Resetting',
  [SwarmitDeviceStatus.Programming]: 'Programming',
};

/** Nome legível do estado ("Bootloader", "Running"...). */
export function swarmitStatusName(status: SwarmitDeviceStatus): string {
  return STATUS_NAMES[status] ?? `?${status}`;
}

const PAYLOAD_NAMES: Record<number, string> = {
  0x80: 'STATUS',
  0x81: 'START',
  0x82: 'STOP',
  0x83: 'RESET',
  0x84: 'OTA_START',
  0x85: 'OTA_CHUNK',
  0x86: 'OTA_START_ACK',
  0x87: 'OTA_CHUNK_ACK',
};

/** Nome do payload pro log ("SWARMIT_START"...). */
export function swarmitPayloadName(type: number): string {
  return `SWARMIT_${PAYLOAD_NAMES[type] ?? `0x${type.toString(16)}`}`;
}

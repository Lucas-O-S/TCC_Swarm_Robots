import type { DotBotAdvertisement } from '../Integration/Protocols/DotBot.Payload';

/**
 * Último estado decodificado de um robô, como o backend guarda no
 * SwarmService (`RobotState`: payloadType + data + updatedAt) e manda no
 * `robot:update` e no `GET /robots/:address/status`. Só o
 * DOTBOT_ADVERTISEMENT (0x06) vira `advertisement`; os outros tipos (GPS do
 * SailBot etc.) chegam com `advertisement = null`.
 *
 * Unidades do fio: pos em mm (0xFFFFFFFF = ainda sem localização),
 * direction em graus (-1 = sem leitura), battery em mV e mode no formato
 * do firmware (`DotBotControlMode`: Manual = 0, Auto = 1).
 */
export interface RobotTelemetryModel {
  payloadType: number;
  advertisement: DotBotAdvertisement | null;
  /** Quando o backend recebeu o frame (`updatedAt` do RobotState). */
  updatedAt: Date;
}

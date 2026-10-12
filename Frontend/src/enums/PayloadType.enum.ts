/**
 * Espelha `src/Enums/PayloadType.enum.ts` do backend (payloads da aplicação
 * DotBot, dotbot/protocol.py). Subconjunto usado pela tela de Simulação: os
 * 4 comandos que descem + a telemetria/pose que sobe. Objeto `as const` em
 * vez de `enum` — ver nota em `RobotStatus.enum.ts`.
 */
export const PayloadType = {
  CMD_MOVE_RAW: 0x00,
  CMD_RGB_LED: 0x01,
  ADVERTISEMENT: 0x04,
  DOTBOT_ADVERTISEMENT: 0x06,
  CONTROL_MODE: 0x07,
  LH2_WAYPOINTS: 0x08,
  DOTBOT_SIMULATOR_DATA: 0xfa,
} as const;

export type PayloadType = (typeof PayloadType)[keyof typeof PayloadType];

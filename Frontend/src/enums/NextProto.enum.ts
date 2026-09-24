/**
 * Espelha `src/Enums/NextProto.enum.ts` do backend — multiplex de protocolo
 * de camada superior no header Mari (marilib/mari_protocol.py 0.10.0).
 * Objeto `as const` em vez de `enum` — ver nota em `RobotStatus.enum.ts`.
 */
export const NextProto = {
  MARI_INTERNAL: 0x01,
  SWARMIT_TESTBED: 0x10, // testbed: status, start/stop, OTA
  DOTBOT_APP: 0x11,
  UNKNOWN: 0xff,
} as const;

export type NextProto = (typeof NextProto)[keyof typeof NextProto];

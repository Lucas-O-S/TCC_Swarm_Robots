/**
 * Espelha `src/Enums/EdgeEvent.enum.ts` do backend — o 1º byte de toda
 * mensagem de borda do gateway (tópicos MQTT to_edge/to_cloud). Objeto
 * `as const` em vez de `enum` — ver nota em `RobotStatus.enum.ts`.
 */
export const EdgeEvent = {
  NODE_JOINED: 1,
  NODE_LEFT: 2,
  NODE_DATA: 3,
  NODE_KEEP_ALIVE: 4,
  GATEWAY_INFO: 5,
  UNKNOWN: 255,
} as const;

export type EdgeEvent = (typeof EdgeEvent)[keyof typeof EdgeEvent];

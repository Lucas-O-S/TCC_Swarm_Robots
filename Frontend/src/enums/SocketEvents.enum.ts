/**
 * Espelha `src/Enums/SocketEvents.enum.ts` do backend: os eventos que o
 * `RobotWebsockets` (socket.io, `src/Websockets/Robot.Websockets.ts`) emite
 * pro front. Payloads (`src/Websockets/Socket.Events.ts`, schemas em
 * `dto/robot.socket.dto.ts`):
 *   - robot:updates → `{ updates: [...] }`, lote (~100 ms) dos estados novos
 *     que chegaram, em ordem; cada item é um robot:update
 *     `{ address, position, battery, waypointIdx, updatedAt }` (posição sem
 *     sentinela, bateria em Volts). O SocketApiLink desmonta o lote e entrega
 *     cada item como um evento `RobotUpdate` — o resto do front não vê o lote;
 *   - robot:status → `{ address, status }`, quando o status muda por
 *     silêncio (5 s → Inactive, 60 s → Lost), sem pacote novo;
 *   - robot:new → `{ robot }`, quando o auto-cadastro cria o robô (o
 *     RobotModel inteiro, mesmo formato do GET /robots).
 *
 * Objeto `as const` em vez de `enum` — ver nota em `RobotStatus.enum.ts`.
 */
export const SocketEvents = {
  /** Item do lote `robot:updates` (não é emitido sozinho pelo backend). */
  RobotUpdate: 'robot:update',
  RobotUpdates: 'robot:updates',
  RobotStatus: 'robot:status',
  RobotNew: 'robot:new',
} as const;

export type SocketEvents = (typeof SocketEvents)[keyof typeof SocketEvents];

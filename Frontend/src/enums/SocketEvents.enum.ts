/**
 * Espelha `src/Enums/SocketEvents.enum.ts` do backend: os eventos que o
 * `RobotWebsockets` (socket.io, `src/Websockets/Robot.Websockets.ts`) emite
 * pro front. Payloads (`src/Websockets/Socket.Events.ts`, schemas em
 * `dto/robot.socket.dto.ts`):
 *   - robot:update → `{ address, position, battery, waypointIdx, updatedAt }`,
 *     a cada estado novo (posição sem sentinela, bateria em Volts);
 *   - robot:status → `{ address, status }`, quando o status muda por
 *     silêncio (5 s → Inactive, 60 s → Lost), sem pacote novo;
 *   - robot:new → `{ robot }`, quando o auto-cadastro cria o robô (o
 *     RobotModel inteiro, mesmo formato do GET /robots).
 *
 * Objeto `as const` em vez de `enum` — ver nota em `RobotStatus.enum.ts`.
 */
export const SocketEvents = {
  RobotUpdate: 'robot:update',
  RobotStatus: 'robot:status',
  RobotNew: 'robot:new',
} as const;

export type SocketEvents = (typeof SocketEvents)[keyof typeof SocketEvents];

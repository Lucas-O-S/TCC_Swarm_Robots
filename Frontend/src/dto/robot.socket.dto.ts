import { z } from 'zod';
import { robotDtoSchema } from './robot.dto';

/**
 * Espelha `src/Websockets/Socket.Events.ts` do backend: o payload de cada
 * evento que o `RobotWebsockets` emite (nomes em `enums/SocketEvents.enum.ts`).
 * Sem envelope ApiResponse — evento é push, chega cru.
 */

/** Posição já tratada pela borda (sem sentinela). LH2: x/y em mm; GPS: x = lat, y = lon, em graus. */
export const robotPositionEventDtoSchema = z.object({
  source: z.number(),
  x: z.number(),
  y: z.number(),
  /** Graus; null = sem leitura. */
  direction: z.number().nullable(),
});

/** Estado novo de um robô — item do lote `robot:updates`. */
export const robotUpdateEventDtoSchema = z.object({
  address: z.string(),
  position: robotPositionEventDtoSchema.nullable(),
  /** Volts, igual `robots.battery`. null = payload sem bateria. */
  battery: z.number().nullable(),
  waypointIdx: z.number().nullable(),
  /** ISO 8601. */
  updatedAt: z.string(),
});

/**
 * `robot:updates`: lote dos estados que chegaram desde o último envio. Os
 * itens ficam `unknown` aqui e são validados um a um no SocketApiLink, pra um
 * item fora do formato não derrubar o lote inteiro.
 */
export const robotUpdatesEventDtoSchema = z.object({
  updates: z.array(z.unknown()),
});

/** `robot:status`: status recalculado pelo silêncio (Active/Inactive/Lost). */
export const robotStatusEventDtoSchema = z.object({
  address: z.string(),
  status: z.number(),
});

/** `robot:new`: robô cadastrado no primeiro anúncio, no mesmo formato do GET /robots. */
export const robotNewEventDtoSchema = z.object({
  robot: robotDtoSchema,
});

export type RobotPositionEventDto = z.infer<typeof robotPositionEventDtoSchema>;
export type RobotUpdateEventDto = z.infer<typeof robotUpdateEventDtoSchema>;
export type RobotStatusEventDto = z.infer<typeof robotStatusEventDtoSchema>;
export type RobotNewEventDto = z.infer<typeof robotNewEventDtoSchema>;

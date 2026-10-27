import { z } from 'zod';

/**
 * Espelha `ObstacleModel` do backend (+ `BaseModel`), como vem aninhado em
 * `scenario.obstacles`. Tamanhos e posição em **milímetros**.
 * `description` é `allowNull` no banco, por isso `nullish`.
 */
export const obstacleDtoSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  description: z.string().nullish(),
  sizeX: z.number(),
  sizeY: z.number(),
  startPointX: z.number(),
  startPointY: z.number(),
  scenarioId: z.string().uuid(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullish(),
});

export type ObstacleDto = z.infer<typeof obstacleDtoSchema>;

/**
 * Obstáculo no CORPO de `POST/PUT /scenarios` (`ObstacleDto` do backend).
 * Sem `uuid`/`scenarioId`: o backend preenche. Campos extras = 400
 * (`forbidNonWhitelisted`). Mesmas regras do `class-validator` de lá.
 */
export const obstacleInputSchema = z.object({
  name: z.string().min(1, 'O nome do obstáculo não pode ser vazio'),
  description: z.string().optional(),
  sizeX: z.number().int('sizeX do obstáculo deve ser um número inteiro').min(1, 'sizeX do obstáculo deve ser no mínimo 1'),
  sizeY: z.number().int('sizeY do obstáculo deve ser um número inteiro').min(1, 'sizeY do obstáculo deve ser no mínimo 1'),
  startPointX: z.number().int('startPointX deve ser um número inteiro').min(0, 'startPointX deve ser no mínimo 0'),
  startPointY: z.number().int('startPointY deve ser um número inteiro').min(0, 'startPointY deve ser no mínimo 0'),
});

export type ObstacleInput = z.infer<typeof obstacleInputSchema>;
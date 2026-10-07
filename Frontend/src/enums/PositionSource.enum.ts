/**
 * Espelha `src/Enums/PositionSource.enum.ts` do backend.
 *
 *  - LH2 (0): `x`/`y` em milímetros (DotBot, Freebot, XGO).
 *  - GPS (1): `x` = latitude, `y` = longitude, em graus decimais (SailBot).
 */
export const PositionSource = {
  LH2: 0,
  GPS: 1,
} as const;

export type PositionSource = (typeof PositionSource)[keyof typeof PositionSource];

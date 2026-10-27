/**
 * Espelha `src/Enums/RobotApplication.enum.ts` do backend (protocolo
 * DotBot). Objeto `as const` em vez de `enum` — ver nota em
 * `RobotStatus.enum.ts` (`erasableSyntaxOnly: true`).
 */
export const RobotApplication = {
  DotBot: 0,
  SailBot: 1,
  Freebot: 2,
  XGO: 3,
  LH2Mini: 4,
} as const;

export type RobotApplication = (typeof RobotApplication)[keyof typeof RobotApplication];

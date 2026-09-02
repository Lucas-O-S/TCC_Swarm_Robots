/**
 * Espelha `RobotStatus` (`src/Enums/RobotStatus.enum.ts`) do backend.
 * Nunca é transmitido pelo robô — é recalculado pelo `SwarmService` a
 * partir de `lastSync` (Active: <5s silêncio, Inactive: 5–60s, Lost: >60s).
 * Só leitura: não faz parte de `RobotUpdateDto`.
 *
 * Objeto `as const` em vez de `enum`: o `tsconfig.app.json` deste projeto
 * tem `erasableSyntaxOnly: true`, que não permite `enum` (erro TS1294).
 */
export const RobotStatus = {
  Active: 0,
  Inactive: 1,
  Lost: 2,
} as const;

export type RobotStatus = (typeof RobotStatus)[keyof typeof RobotStatus];

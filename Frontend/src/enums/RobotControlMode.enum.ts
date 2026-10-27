/**
 * Espelha `src/Enums/RobotControlMode.enum.ts` do backend. Cada robô tem
 * seu próprio modo (coluna `mode`) — parte da frota pode estar em Manual e
 * parte em Auto/SemiAuto ao mesmo tempo. Objeto `as const` em vez de `enum`
 * — ver nota em `RobotStatus.enum.ts` (`erasableSyntaxOnly: true`).
 */
export const RobotControlMode = {
  Auto: 0,
  Manual: 1,
  SemiAuto: 2,
} as const;

export type RobotControlMode = (typeof RobotControlMode)[keyof typeof RobotControlMode];

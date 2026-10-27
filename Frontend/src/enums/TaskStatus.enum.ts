/**
 * Espelha `TaskStatus` do backend.
 *
 * Objeto `as const` em vez de `enum` — ver nota em `RobotStatus.enum.ts`
 * (`erasableSyntaxOnly: true`).
 */
export const TaskStatus = {
  Pending: 0,
  InProgress: 1,
  Completed: 2,
  Cancelled: 3,
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
/**
 * Espelha `TaskStatus` do backend (ver `Task.Model.ts`: "Starts Pending;
 * automation (Orchestrator) marks it InProgress on assignment and
 * Completed when the robot finishes.").
 *
 * SUPOSIÇÃO: os valores numéricos exatos não foram confirmados contra o
 * arquivo do enum do backend — assumimos a ordem óbvia de declaração
 * abaixo (mesma suposição já documentada em ARQUITETURA_API.md). Se
 * `GET /tasks` vier com um `status` que não bate com o rótulo esperado na
 * tela, é o primeiro lugar a conferir.
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

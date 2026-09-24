/**
 * Modo de controle NO FIO (payload CONTROL_MODE 0x07 do firmware/PyDotBot):
 * Manual = 0, Auto = 1. É o que o simulador emula.
 *
 * ATENÇÃO: diferente de `RobotControlMode` (Auto = 0, Manual = 1,
 * SemiAuto = 2), que é o conceito de ORQUESTRAÇÃO do backend (coluna `mode`
 * do banco). A tradução entre os dois é do backend.
 *
 * Objeto `as const` em vez de `enum` — ver nota em `RobotStatus.enum.ts`
 * (`erasableSyntaxOnly: true`).
 */
export const DotBotControlMode = {
  Manual: 0,
  Auto: 1,
} as const;

export type DotBotControlMode = (typeof DotBotControlMode)[keyof typeof DotBotControlMode];

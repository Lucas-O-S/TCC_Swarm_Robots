/**
 * Os 3 estados reais que o backend calcula a partir de `lastSync` (ver
 * `RobotStatus.enum.ts`). "Carregando"/"Sem bateria" existiam nos dados de
 * exemplo antigos mas não têm correspondente no backend (não há sensor de
 * carga no `RobotModel`) — foram removidos ao ligar na API real.
 */
export type RobotCondition = 'Ativo' | 'Inativo' | 'Perdido';

export interface Robot {
  /** uuid do robô no backend. */
  id: string;
  label: string;
  condition: RobotCondition;
  /** Percentual estimado (Volts convertido — ver `Robot.Mapper.ts`). */
  battery: number | null;
  /** Nome da task atual, "-" se nenhuma atribuída. */
  task: string;
}

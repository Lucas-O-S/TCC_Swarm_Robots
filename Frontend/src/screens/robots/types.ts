// Tipos locais provisórios desta tela (UI).
// Substituir pelos modelos de `model/` (RobotModel + DotBotStatus) quando a
// integração com o backend existir.

export type RobotCondition = 'Ativo' | 'Carregando' | 'Sem bateria' | 'Out of Bounds';

export interface Robot {
  id: string;
  label: string;
  condition: RobotCondition;
  battery: number | null; // percentual; null quando não há leitura
  task: string; // nome da tarefa atual, "-" quando nenhuma
}

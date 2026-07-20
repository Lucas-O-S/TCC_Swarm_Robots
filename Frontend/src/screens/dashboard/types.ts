// Tipos locais provisórios desta tela (UI).
// Substituir pelos modelos de `model/` quando você criá-los.
export interface Robot {
  id: number;
  label: string;
  col: number;
  row: number;
  online: boolean;
  status: string;
  tarefa: string;
}

export type AlertLevel = 'critico' | 'info';

export interface Alert {
  id: number;
  timestamp: string;
  message: string;
  level: AlertLevel;
}

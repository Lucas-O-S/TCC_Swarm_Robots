// Tipos locais provisórios desta tela (UI). Substituir pelos modelos reais
// (`RobotModel`, `robot:update`/`robot:status` do WebSocket) quando a
// integração com o backend existir.

export type ConnectionStatus = 'online' | 'selecionado' | 'offline';

// Um robô no mapa em tempo real: posição em células de grid + estado de conexão.
export interface RobotConnection {
  id: string;
  label: string;
  col: number;
  row: number;
  status: ConnectionStatus;
}

// Barreira retangular no mapa (em células de grid).
export interface Obstacle {
  id: string;
  col: number;
  row: number;
  width: number;
  height: number;
}

// Ponto de recarregamento: robôs com tarefa quase concluída retornam a ele.
export interface ChargePoint {
  col: number;
  row: number;
}

export interface ConnectionLogEntry {
  id: string;
  message: string;
}

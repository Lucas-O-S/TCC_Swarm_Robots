// Tipos desta tela (UI). Os robôs vêm do backend (`RobotModel` + última
// `PositionModel`), convertidos em `robotConnections.ts`.

export type ConnectionStatus = 'online' | 'selecionado' | 'offline';

// Um robô no mapa em tempo real: posição em células de grid + estado de conexão.
export interface RobotConnection {
  id: string;
  label: string;
  /** `null` = o backend ainda não registrou nenhuma posição desse robô. */
  col: number | null;
  row: number | null;
  status: ConnectionStatus;
}

/** Robô que já tem posição e, portanto, pode ser desenhado no mapa. */
export type PositionedRobot = RobotConnection & { col: number; row: number };

export function hasPosition(robot: RobotConnection): robot is PositionedRobot {
  return robot.col !== null && robot.row !== null;
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
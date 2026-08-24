import type { ControlMode, RobotStatusValue } from '../protocol/enums';

export interface Waypoint {
  x: number;
  y: number;
}

// Estado "quente" de um robô simulado — tudo que muda a cada tick de física.
export interface SimRobotState {
  address: string;
  label: string;
  posX: number;
  posY: number;
  theta: number;
  battery: number; // percentual (0-100), só para exibição na UI
  mode: ControlMode;
  status: RobotStatusValue;
  pwmLeft: number;
  pwmRight: number;
  waypoints: Waypoint[];
  waypointIdx: number;
  online: boolean; // false quando uma falha foi simulada ("Derrubar falha")
}

// Barreira retangular (mm), a mesma unidade do mundo LH2 do DotBot.
export interface Obstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Arena {
  widthMm: number;
  heightMm: number;
  gridMm: number;
}

export interface ScenarioRobot {
  address: string;
  label: string;
  x: number;
  y: number;
  theta: number;
  battery: number;
}

// Modelo de dados do cenário — ver SIMULADOR_PLANO.md, seção 7.
export interface Scenario {
  version: number;
  name: string;
  arena: Arena;
  obstacles: Obstacle[];
  robots: ScenarioRobot[];
}

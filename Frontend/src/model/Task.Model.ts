import type { TaskStatus } from '../enums/TaskStatus.enum';

export interface TaskWaypointModel {
  orderIndex: number;
  x: number;
  y: number;
}

/** Robô associado a uma task — só o resumo (ver `taskDtoSchema`). */
export interface TaskRobotSummaryModel {
  uuid: string;
  address: string;
  name: string;
}

/**
 * Task no formato usado pela UI — tradução direta do DTO. `robotCount`
 * "desejado" e `cyclic` (repetir ao concluir) não existem no backend: são
 * conceitos só de tela, tratados em `screens/tasks/hooks/useTasks.ts`.
 */
export interface TaskModel {
  uuid: string;
  name: string;
  priority: number;
  status: TaskStatus;
  waypoints: TaskWaypointModel[];
  robots: TaskRobotSummaryModel[];
  isDeleted: boolean;
}

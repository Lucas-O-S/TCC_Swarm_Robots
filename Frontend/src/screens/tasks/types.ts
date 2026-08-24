// Tipos locais provisórios desta tela (UI).
// Substituir pelos modelos reais (`TaskModel` + `TaskWaypointModel`) quando a
// integração com o backend (Orchestrator) existir.

export type TaskStatus = 'Na fila' | 'Executando' | 'Concluída' | 'Cancelada';

export type RouteMode = 'rota' | 'area';

export interface GridPoint {
  col: number;
  row: number;
}

// "rota": sequência de waypoints (`points` é a lista, na ordem de visita).
// "area": retângulo definido por dois cantos opostos (`points` tem só 2).
export interface TaskRoute {
  mode: RouteMode;
  points: GridPoint[];
}

export interface Task {
  id: string;
  name: string;
  robotCount: number;
  route: TaskRoute | null;
  status: TaskStatus;
  cyclic: boolean;
}

// Rascunho usado pelo formulário de criação — a task ainda não tem `id`/`status`.
export interface TaskDraft {
  name: string;
  robotCount: number;
  cyclic: boolean;
  route: TaskRoute | null;
}

// Estado inicial (sem pontos) do editor de rota — usado tanto pelo
// formulário de criação quanto pelo modal de edição.
export const EMPTY_ROUTE: TaskRoute = { mode: 'rota', points: [] };

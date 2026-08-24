import type { TaskRoute } from '../types';

// Texto curto pra coluna "Local" da tabela de tarefas.
export function formatRoute(route: TaskRoute | null): string {
  if (!route || route.points.length === 0) return 'sem local definido';

  if (route.mode === 'area' && route.points.length === 2) {
    const [a, b] = route.points;
    return `Área (${a.col},${a.row})–(${b.col},${b.row})`;
  }

  const [first] = route.points;
  return `Rota (${route.points.length} pts) — início (${first.col},${first.row})`;
}

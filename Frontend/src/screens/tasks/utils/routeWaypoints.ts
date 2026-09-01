import type { GridPoint, TaskRoute } from '../types';
import type { TaskWaypointInput } from '../../../dto/taskWaypoint.dto';
import type { TaskWaypointModel } from '../../../model/Task.Model';

/**
 * Escala usada pra converter a grade da tela (colunas/linhas do
 * `RouteEditor`, 16x8) pra milímetros (unidade real dos waypoints LH2 no
 * backend — `TaskWaypointModel.x/y`).
 *
 * SUPOSIÇÃO: não existe uma escala "oficial" ligando esse grid ao mundo
 * real — usamos o mesmo `gridMm` (100mm/célula) do cenário padrão do
 * simulador (`simulator/core/scenario.ts`) só por consistência dentro do
 * projeto. Ajustar se a arena real do TCC tiver outra escala/tamanho.
 */
const CELL_MM = 100;

/**
 * Só o modo "rota" (sequência de pontos) vira waypoints reais — "área"
 * (retângulo, 2 cantos) não tem correspondente no backend hoje
 * (`TaskWaypointModel` só guarda uma lista ordenada de pontos, não uma
 * região/polígono). Retorna `undefined` nesse caso: quem chama decide não
 * mandar nada pro backend e manter a rota só localmente.
 */
export function routeToWaypointInputs(route: TaskRoute | null): TaskWaypointInput[] | undefined {
  if (!route || route.mode !== 'rota' || route.points.length === 0) return undefined;
  return route.points.map((p) => ({ x: p.col * CELL_MM, y: p.row * CELL_MM }));
}

export function waypointsToRoute(waypoints: TaskWaypointModel[]): TaskRoute | null {
  if (waypoints.length === 0) return null;
  const points: GridPoint[] = waypoints
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((w) => ({ col: Math.round(w.x / CELL_MM), row: Math.round(w.y / CELL_MM) }));
  return { mode: 'rota', points };
}

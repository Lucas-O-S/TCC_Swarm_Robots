import type { CellSelectRect } from "../../components/MapCanvas/MapCanvas";

/** Waypoint em edição — `id` é local (frontend), estável enquanto o ponto existe (mesmo padrão de ObstaclesModel.id); `x`/`y` são célula do grid (mesma convenção de TaskWaypointModel/RobotPath). */
export interface TaskWaypointDraft {
  id: string;
  x: number;
  y: number;
}

// Waypoint novo a partir do retângulo de criação do <MapCanvas> (createTool
// "waypoint" OU "area" — uma área/bloco é só uma sequência de waypoints
// fechada em loop no fim, mesmo sistema, ver TaskBuilder) — um clique sem
// arrasto já chega aqui como um retângulo de área zero, então só o canto
// inicial importa (sizeX/sizeY do retângulo são ignorados). Arredonda pra
// célula inteira e trava dentro do grid, pra não repetir o obstáculo (ver
// useObstacleEditor.ts/createObstacleFromRect) que deixa passar coordenada
// fora do mapa quando o arrasto termina fora dele.
export function createWaypointFromRect(rect: CellSelectRect, sizeX: number, sizeY: number): TaskWaypointDraft {
  return {
    id: crypto.randomUUID(),
    x: Math.max(0, Math.min(sizeX - 1, Math.round(rect.startPointX))),
    y: Math.max(0, Math.min(sizeY - 1, Math.round(rect.startPointY))),
  };
}

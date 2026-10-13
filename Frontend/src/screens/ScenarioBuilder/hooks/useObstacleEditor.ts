import type { CellSelectRect } from "../../../components/MapCanvas/MapCanvas";
import type { ObstacleModel } from "../../../model/Obstacle.Model";

// Próximo "Obstáculo N" livre — olha o maior N já usado (não só a
// quantidade), pra não repetir número depois de apagar um obstáculo no meio.
function nextObstacleName(obstacles: ObstacleModel[]) {
    let max = 0;
    for (const o of obstacles) {
        const match = /^Obstáculo (\d+)$/.exec(o.name);
        if (match) max = Math.max(max, Number(match[1]));
    }
    return `Obstáculo ${max + 1}`;
}

// Único bit que continua específico do ScenarioBuilder: "desenhar um
// obstáculo novo" é criar uma entidade, não uma capacidade genérica de
// mapa (diferente de selecionar/mover/remover — ver src/hooks/useMapElements.tsx,
// que já cobre isso pra qualquer <Obstacle selectable movable removable>).
// O gesto de arrastar em célula vazia é tratado pelo próprio <MapCanvas>
// (prop `createTool`/`onCreateElement`) — esta função só traduz o
// retângulo final (em células) num `ObstacleModel` novo.
export function createObstacleFromRect(rect: CellSelectRect, obstacles: ObstacleModel[]): ObstacleModel {
    return {
        id: crypto.randomUUID(),
        name: nextObstacleName(obstacles),
        description: "",
        sizeX: Math.max(1, Math.round(rect.sizeX)),
        sizeY: Math.max(1, Math.round(rect.sizeY)),
        startPointX: Math.round(rect.startPointX),
        startPointY: Math.round(rect.startPointY),
        scenarioId: "",
    };
}
import type { CellSelectRect } from "../../components/MapCanvas/MapCanvas";

/** Waypoint em edição — `id` é local (frontend), estável enquanto o ponto existe (mesmo padrão de ObstaclesModel.id); `x`/`y` são célula do grid (mesma convenção de TaskWaypointModel/RobotPath). */
export interface TaskWaypointDraft {
  id: string;
  x: number;
  y: number;
}

export type AreaCorner = "tl" | "tr" | "br" | "bl";

/** Sentido (na tela) em que os cantos do meio são numerados a partir da entrada — ver `areaTraversal`. */
export type AreaDirection = "cw" | "ccw";

/** Como o bloco é percorrido: só os 4 cantos, ou zigzag com passadas horizontais (↔) ou verticais (↕). */
export type AreaPattern = "perimeter" | "zigzag-h" | "zigzag-v";

/**
 * Área/bloco em edição — sempre um retângulo, guardado por dois cantos
 * opostos (célula do grid, mesma convenção do waypoint). Os 4 cantos são
 * derivados daqui (ver `areaCorners`), então nunca dá pra ter um
 * quadrilátero torto. O resto define o percurso dentro do bloco (ver
 * `areaTraversal`):
 * - `pattern` "perimeter": `entry`/`exit` (nunca o mesmo canto) + `direction`;
 * - `pattern` "zigzag-*": começa em `entry`, `lanes` passadas de lado a lado
 *   (a saída sai disso); `exit`/`direction` ficam guardados pra quando voltar
 *   pro contorno.
 */
export interface TaskAreaDraft {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pattern: AreaPattern;
  entry: AreaCorner;
  exit: AreaCorner;
  direction: AreaDirection;
  lanes: number;
}

/** Campos do percurso dentro do bloco — o que o AreaDrawer edita. */
export type AreaTraversalSettings = Pick<TaskAreaDraft, "pattern" | "entry" | "exit" | "direction" | "lanes">;

/** Ponto do percurso de um bloco — `corner` só existe quando o ponto é um dos 4 cantos (aí `id` é o id do canto, o mesmo do marcador arrastável). */
export interface AreaPoint {
  id: string;
  x: number;
  y: number;
  corner?: AreaCorner;
}

/**
 * Uma parada da rota — waypoint unitário OU bloco, numa lista só: a ordem da
 * lista (ordem de criação) é a ordem da rota, então os dois tipos ficam
 * sempre ligados em sequência (ver `flattenRoute`).
 */
export type TaskStopDraft = ({ kind: "waypoint" } & TaskWaypointDraft) | ({ kind: "area" } & TaskAreaDraft);

/** Os 4 cantos do bloco na ordem do loop (sentido horário a partir de (x1, y1)) — cada canto sabe quais eixos ele controla (x1/x2, y1/y2). */
export function areaCorners(area: Pick<TaskAreaDraft, "id" | "x1" | "y1" | "x2" | "y2">) {
  return [
    { corner: "tl", id: `${area.id}-tl`, x: area.x1, y: area.y1 },
    { corner: "tr", id: `${area.id}-tr`, x: area.x2, y: area.y1 },
    { corner: "br", id: `${area.id}-br`, x: area.x2, y: area.y2 },
    { corner: "bl", id: `${area.id}-bl`, x: area.x1, y: area.y2 },
  ] as const satisfies readonly { corner: AreaCorner; id: string; x: number; y: number }[];
}

/** Máximo de passadas do zigzag — uma por linha (↔) ou coluna (↕) de célula do bloco, pra nenhuma passada cair em cima da outra. */
export function zigzagMaxLanes(area: TaskAreaDraft) {
  return (area.pattern === "zigzag-v" ? Math.abs(area.x2 - area.x1) : Math.abs(area.y2 - area.y1)) + 1;
}

/** `lanes` travado entre 2 e o máximo atual — o bloco pode ter encolhido depois que o valor foi escolhido. */
export function zigzagLanes(area: TaskAreaDraft) {
  return Math.max(2, Math.min(zigzagMaxLanes(area), area.lanes));
}

// Pontos do bloco na ordem de percurso (ver TaskAreaDraft) — sempre inclui os
// 4 cantos; no zigzag, também os pontos de dentro.
export function areaTraversal(area: TaskAreaDraft): AreaPoint[] {
  return area.pattern === "perimeter" ? perimeterTraversal(area) : zigzagTraversal(area);
}

// Zigzag: passadas paralelas de um lado ao outro do bloco (↔ = linhas, ↕ =
// colunas), começando no canto `entry` e indo em direção ao lado oposto,
// alternando o sentido a cada passada. A 1ª e a última passada ficam nas
// bordas do bloco (então os 4 cantos entram no percurso) e as do meio são
// distribuídas por igual, arredondadas pra célula inteira — com no máximo 1
// passada por célula (`zigzagLanes`), nunca duas caem na mesma.
function zigzagTraversal(area: TaskAreaDraft): AreaPoint[] {
  const corners = areaCorners(area);
  const start = corners.find((c) => c.corner === area.entry) ?? corners[0];
  const horizontal = area.pattern === "zigzag-h";
  const otherX = start.x === area.x1 ? area.x2 : area.x1;
  const otherY = start.y === area.y1 ? area.y2 : area.y1;

  // "lane" = eixo em que as passadas se sucedem; "side" = eixo percorrido em cada passada.
  const [laneFrom, laneTo] = horizontal ? [start.y, otherY] : [start.x, otherX];
  const [sideFrom, sideTo] = horizontal ? [start.x, otherX] : [start.y, otherY];
  const lanes = zigzagLanes(area);

  const points: AreaPoint[] = [];
  for (let k = 0; k < lanes; k++) {
    const lane = Math.round(laneFrom + (k * (laneTo - laneFrom)) / (lanes - 1));
    const ends = k % 2 === 0 ? [sideFrom, sideTo] : [sideTo, sideFrom];

    ends.forEach((side, end) => {
      const x = horizontal ? side : lane;
      const y = horizontal ? lane : side;
      const corner = corners.find((c) => c.x === x && c.y === y);
      points.push(corner ? { id: corner.id, x, y, corner: corner.corner } : { id: `${area.id}-z${k}-${end}`, x, y });
    });
  }
  return points;
}

// Contorno — ordem em que os 4 cantos são visitados: entrada primeiro, saída
// por último (sempre cantos diferentes — o AreaDrawer não deixa escolher o
// mesmo), e os 2 do meio na ordem em que aparecem girando a partir da
// entrada no `direction` escolhido — o sentido só muda essa ordenação.
// `ring` é horário na tela enquanto x1 < x2 e y1 < y2; se um canto foi
// arrastado por cima do oposto (um dos eixos invertido), o anel vira
// anti-horário e o passo inverte junto, pra "horário" continuar sendo
// horário na tela.
function perimeterTraversal(area: TaskAreaDraft): AreaPoint[] {
  const ring = areaCorners(area);
  const at = (k: number) => ring[((k % 4) + 4) % 4];
  const i = ring.findIndex((c) => c.corner === area.entry);
  const ringIsClockwise = (area.x2 - area.x1) * (area.y2 - area.y1) > 0;
  const step = (area.direction === "cw") === ringIsClockwise ? 1 : -1;

  const rest = [at(i + step), at(i + 2 * step), at(i + 3 * step)];
  return [at(i), ...rest.filter((c) => c.corner !== area.exit), ...rest.filter((c) => c.corner === area.exit)];
}

// Rota inteira achatada em pontos, na ordem de percurso — waypoint = 1
// ponto; bloco = seus pontos na ordem de `areaTraversal`. `order` numera
// cada ponto (id do waypoint, do canto ou do ponto de zigzag) na rota
// inteira, 1-based; `line` é a polyline que liga tudo em sequência.
export function flattenRoute(stops: TaskStopDraft[]) {
  const order = new Map<string, number>();
  const line: { x: number; y: number }[] = [];

  for (const stop of stops) {
    if (stop.kind === "waypoint") {
      order.set(stop.id, order.size + 1);
      line.push({ x: stop.x, y: stop.y });
      continue;
    }

    for (const c of areaTraversal(stop)) {
      order.set(c.id, order.size + 1);
      line.push({ x: c.x, y: c.y });
    }
  }

  return { order, line };
}

// Arrastar um canto move só os eixos que ele controla — os dois cantos
// vizinhos acompanham (compartilham x ou y com ele), então o bloco continua
// retângulo e só muda de largura/altura. Um eixo que colapsaria (largura ou
// altura 0, virando linha) é ignorado e fica onde estava.
export function moveAreaCorner<T extends TaskAreaDraft>(area: T, corner: AreaCorner, x: number, y: number): T {
  const xKey = corner === "tl" || corner === "bl" ? "x1" : "x2";
  const yKey = corner === "tl" || corner === "tr" ? "y1" : "y2";
  const otherX = xKey === "x1" ? area.x2 : area.x1;
  const otherY = yKey === "y1" ? area.y2 : area.y1;

  return {
    ...area,
    ...(x !== otherX ? { [xKey]: x } : null),
    ...(y !== otherY ? { [yKey]: y } : null),
  };
}

// Bloco novo a partir do retângulo arrastado no <MapCanvas> (createTool
// "area") — cada canto vira a célula onde o arrasto começou/terminou, travada
// dentro do grid. Retorna null quando o arrasto não cobre pelo menos 2
// células em cada eixo (clique sem arrasto, ou só uma linha/coluna), já que
// aí não formaria um retângulo. Entrada padrão = canto mais perto de `from`
// (último ponto da rota até aqui; sem ele, o 1º canto); saída padrão = o
// vizinho anti-horário, que com o sentido horário faz a volta pelos 4 lados;
// padrão contorno, com 3 passadas pré-escolhidas pra quando virar zigzag (o
// usuário troca tudo depois no AreaDrawer).
export function createAreaFromRect(
  rect: CellSelectRect,
  sizeX: number,
  sizeY: number,
  from?: { x: number; y: number },
): ({ kind: "area" } & TaskAreaDraft) | null {
  const clampX = (v: number) => Math.max(0, Math.min(sizeX - 1, Math.floor(v)));
  const clampY = (v: number) => Math.max(0, Math.min(sizeY - 1, Math.floor(v)));
  const x1 = clampX(rect.startPointX);
  const y1 = clampY(rect.startPointY);
  const x2 = clampX(rect.startPointX + rect.sizeX);
  const y2 = clampY(rect.startPointY + rect.sizeY);

  if (x1 === x2 || y1 === y2) return null;

  const id = crypto.randomUUID();
  const ring = areaCorners({ id, x1, y1, x2, y2 });
  const dist = (c: { x: number; y: number }) => (from ? (c.x - from.x) ** 2 + (c.y - from.y) ** 2 : 0);
  const entryIndex = ring.reduce((best, c, k) => (dist(c) < dist(ring[best]) ? k : best), 0);

  return {
    kind: "area",
    id,
    x1,
    y1,
    x2,
    y2,
    entry: ring[entryIndex].corner,
    exit: ring[(entryIndex + 3) % 4].corner,
    direction: "cw",
    pattern: "perimeter",
    lanes: 3,
  };
}

// Waypoint novo a partir do retângulo de criação do <MapCanvas> (createTool
// "waypoint") — um clique sem
// arrasto já chega aqui como um retângulo de área zero, então só o canto
// inicial importa (sizeX/sizeY do retângulo são ignorados). Arredonda pra
// célula inteira e trava dentro do grid, pra não repetir o obstáculo (ver
// useObstacleEditor.ts/createObstacleFromRect) que deixa passar coordenada
// fora do mapa quando o arrasto termina fora dele.
export function createWaypointFromRect(
  rect: CellSelectRect,
  sizeX: number,
  sizeY: number,
): { kind: "waypoint" } & TaskWaypointDraft {
  return {
    kind: "waypoint",
    id: crypto.randomUUID(),
    x: Math.max(0, Math.min(sizeX - 1, Math.round(rect.startPointX))),
    y: Math.max(0, Math.min(sizeY - 1, Math.round(rect.startPointY))),
  };
}

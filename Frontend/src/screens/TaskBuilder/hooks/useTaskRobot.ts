import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RoutePoint } from "./useTaskEditor";

export interface PathPoint {
  x: number;
  y: number;
}

/** Parede/obstáculo em célula do grid: canto (x, y) + tamanho — mesma convenção de ObstaclesModel.startPoint/size. */
export interface Wall {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Raio do corpo do robô pra colisão, em células — 1 célula = BLOCK_SIDE_M
 * (20 cm), então 0,25 = robô de ~10 cm de diâmetro. Menor que meia célula de
 * propósito: o robô cabe num corredor de 1 célula e alcança ponto colado na
 * parede. Ajuste aqui se o robô real for de outro tamanho.
 */
export const ROBOT_RADIUS = 0.25;

/** Maior deslocamento (células) testado de uma vez contra as paredes — passo maior é dividido, pra não atravessar parede fina. */
const COLLISION_SUB_STEP = 0.02;

/** Maior intervalo (s) entre frames que a prévia anda de uma vez — aba em segundo plano pausa a animação em vez de "pular" o robô. */
const MAX_FRAME_DT = 0.1;

/** Ida do robô pelos pontos da rota (▶) — dura até chegar no último ponto ou até o ⏹. */
interface Mission {
  /** Onde o robô estava (e pra onde apontava) quando o ▶ começou — pra onde o ⏹ devolve. */
  origin: PathPoint;
  originHeading: number | null;
  /** Ponto que o robô está indo buscar agora; null = já visitou todos. */
  targetId: string | null;
  /** Índice desse ponto na rota quando foi escolhido — reserva caso o ponto seja apagado no meio do caminho. */
  targetIndex: number;
  /** Nome da parede em que o robô bateu indo pro alvo — a ida fica parada até o próximo ▶. */
  blockedBy: string | null;
}

export interface TaskRobotState {
  /** Célula do grid — fracionária enquanto anda. Só muda quando o PRÓPRIO robô anda ou é reposicionado. */
  position: PathPoint;
  /** Rumo em graus (0° = pra cima, sentido horário) — só muda quando ele anda; null = ainda não andou. */
  heading: number | null;
  mission: Mission | null;
}

// Parede que o corpo do robô (círculo de ROBOT_RADIUS no centro da célula
// `p` — por isso o +0.5) invade, se alguma. Encostar não conta: o robô pode
// parar colado na parede, só não pode entrar nela.
export function wallHit(p: PathPoint, walls: Wall[]): Wall | undefined {
  const cx = p.x + 0.5;
  const cy = p.y + 0.5;
  return walls.find((w) => {
    const nearestX = Math.max(w.x, Math.min(cx, w.x + w.width));
    const nearestY = Math.max(w.y, Math.min(cy, w.y + w.height));
    return (cx - nearestX) ** 2 + (cy - nearestY) ** 2 < ROBOT_RADIUS ** 2 - 1e-9;
  });
}

// Anda `step` células em direção aos alvos, em ordem. Os alvos são lidos da
// rota ATUAL a cada passo, pelo id: se um ponto for movido no meio do
// caminho, o robô passa a ir pro lugar novo dele — mas a posição do robô
// nunca é recalculada a partir da rota, ela só avança a partir de onde ele
// está. Chegar num ponto consome a distância até ele e segue pro próximo com
// o que sobrou do passo, sem perder velocidade entre um ponto e outro.
//
// Colisão (mesma regra do simulador, screens/Simulation/SimPhysics.ts):
// esbarrou numa parede, o robô para ali, colado nela, em vez de deslizar ou
// contornar — e a ida fica bloqueada (`blockedBy`). O trecho é testado em
// sub-passos de COLLISION_SUB_STEP, então não dá pra atravessar parede fina
// mesmo num passo grande.
export function advanceRobot(state: TaskRobotState, points: RoutePoint[], walls: Wall[], step: number): TaskRobotState {
  const { mission } = state;
  if (!mission || mission.targetId === null) return state;

  let { x, y } = state.position;
  let heading = state.heading;
  let targetId: string | null = mission.targetId;
  let targetIndex = mission.targetIndex;
  let remaining = step;

  // No máximo 1 chegada por ponto da rota por passo — garante que o laço
  // termina mesmo com pontos repetidos no mesmo lugar.
  for (let hops = 0; targetId !== null && hops <= points.length; hops++) {
    const found = points.findIndex((p) => p.id === targetId);
    const index = found === -1 ? targetIndex : found;
    const target = points[index];
    if (!target) {
      targetId = null;
      break;
    }
    targetId = target.id;
    targetIndex = index;

    const dx = target.x - x;
    const dy = target.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) heading = (Math.atan2(dx, -dy) * 180) / Math.PI;

    const move = Math.min(dist, remaining);
    const subSteps = Math.ceil(move / COLLISION_SUB_STEP);
    const startX = x;
    const startY = y;
    for (let i = 1; i <= subSteps; i++) {
      const t = (move * i) / subSteps / dist;
      const next = { x: startX + dx * t, y: startY + dy * t };
      const wall = wallHit(next, walls);
      if (wall) {
        return {
          position: { x, y },
          heading,
          mission: { ...mission, targetId, targetIndex, blockedBy: wall.name },
        };
      }
      x = next.x;
      y = next.y;
    }

    if (dist > remaining) break;

    x = target.x;
    y = target.y;
    remaining -= dist;
    targetIndex = index + 1;
    targetId = points[targetIndex]?.id ?? null;
  }

  return { position: { x, y }, heading, mission: { ...mission, targetId, targetIndex } };
}

// Robô da prévia do TaskBuilder: uma entidade com posição própria, sem
// dependência nenhuma dos waypoints — mexer na rota não move o robô. O ▶ só
// dá a ordem de ir até os pontos, na sequência da rota (ver `advanceRobot`),
// a `speed` células/segundo via requestAnimationFrame, batendo nas `walls`.
// O estado vive num ref (o loop lê e escreve sem depender de closure de
// render) espelhado no state pra re-renderizar.
export function useTaskRobot(points: RoutePoint[], walls: Wall[], speed: number) {
  const [robot, setRobotState] = useState<TaskRobotState | null>(null);
  const [playing, setPlaying] = useState(false);
  const robotRef = useRef<TaskRobotState | null>(null);
  const pointsRef = useRef(points);
  const wallsRef = useRef(walls);

  useLayoutEffect(() => {
    pointsRef.current = points;
    wallsRef.current = walls;
  });

  function commit(next: TaskRobotState | null) {
    robotRef.current = next;
    setRobotState(next);
  }

  useEffect(() => {
    if (!playing) return;

    let frame = 0;
    let last: number | null = null;

    function tick(now: number) {
      const current = robotRef.current;
      if (!current?.mission) {
        setPlaying(false);
        return;
      }

      const step = last === null ? 0 : Math.min(MAX_FRAME_DT, (now - last) / 1000) * speed;
      last = now;
      const next = advanceRobot(current, pointsRef.current, wallsRef.current, step);
      commit(next);

      if (next.mission?.targetId === null || next.mission?.blockedBy) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  // Posicionar/arrastar/remover na mão: o robô fica onde foi colocado
  // (mantém o rumo) e a ida em andamento é cancelada. Dentro de parede não
  // dá — devolve false e o robô continua onde estava.
  function place(position: PathPoint | null): boolean {
    if (position && wallHit(position, wallsRef.current)) return false;
    setPlaying(false);
    commit(position ? { position, heading: robotRef.current?.heading ?? null, mission: null } : null);
    return true;
  }

  // ▶: sem ida em andamento (ou a anterior já terminou), começa uma nova de
  // onde o robô está AGORA até o 1º ponto; pausada ou bloqueada numa parede,
  // tenta continuar (se nada mudou, bate de novo na hora).
  function play() {
    const current = robotRef.current;
    const first = pointsRef.current[0];
    if (!current || !first) return;

    if (!current.mission || current.mission.targetId === null) {
      commit({
        ...current,
        mission: {
          origin: current.position,
          originHeading: current.heading,
          targetId: first.id,
          targetIndex: 0,
          blockedBy: null,
        },
      });
    } else if (current.mission.blockedBy) {
      commit({ ...current, mission: { ...current.mission, blockedBy: null } });
    }
    setPlaying(true);
  }

  function pause() {
    setPlaying(false);
  }

  // ⏹: encerra a ida e devolve o robô pra onde ele estava no ▶.
  function stop() {
    const current = robotRef.current;
    setPlaying(false);
    if (current?.mission) {
      commit({ position: current.mission.origin, heading: current.mission.originHeading, mission: null });
    }
  }

  return { robot, playing, place, play, pause, stop };
}

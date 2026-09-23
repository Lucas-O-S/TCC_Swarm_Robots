import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RoutePoint } from "./useTaskEditor";

export interface PathPoint {
  x: number;
  y: number;
}

/** Ida do robô pelos pontos da rota (▶) — dura até chegar no último ponto ou até o ⏹. */
interface Mission {
  /** Onde o robô estava (e pra onde apontava) quando o ▶ começou — pra onde o ⏹ devolve. */
  origin: PathPoint;
  originHeading: number | null;
  /** Ponto que o robô está indo buscar agora; null = já visitou todos. */
  targetId: string | null;
  /** Índice desse ponto na rota quando foi escolhido — reserva caso o ponto seja apagado no meio do caminho. */
  targetIndex: number;
}

export interface TaskRobotState {
  /** Célula do grid — fracionária enquanto anda. Só muda quando o PRÓPRIO robô anda ou é reposicionado. */
  position: PathPoint;
  /** Rumo em graus (0° = pra cima, sentido horário) — só muda quando ele anda; null = ainda não andou. */
  heading: number | null;
  mission: Mission | null;
}

// Anda `step` células em direção aos alvos, em ordem. Os alvos são lidos da
// rota ATUAL a cada passo, pelo id: se um ponto for movido no meio do
// caminho, o robô passa a ir pro lugar novo dele — mas a posição do robô
// nunca é recalculada a partir da rota, ela só avança a partir de onde ele
// está. Chegar num ponto consome a distância até ele e segue pro próximo com
// o que sobrou do passo, sem perder velocidade entre um ponto e outro.
export function advanceRobot(state: TaskRobotState, points: RoutePoint[], step: number): TaskRobotState {
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

    if (dist > remaining) {
      x += (dx / dist) * remaining;
      y += (dy / dist) * remaining;
      break;
    }

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
// a `speed` células/segundo via requestAnimationFrame. O estado vive num ref
// (o loop lê e escreve sem depender de closure de render) espelhado no state
// pra re-renderizar.
export function useTaskRobot(points: RoutePoint[], speed: number) {
  const [robot, setRobotState] = useState<TaskRobotState | null>(null);
  const [playing, setPlaying] = useState(false);
  const robotRef = useRef<TaskRobotState | null>(null);
  const pointsRef = useRef(points);

  useLayoutEffect(() => {
    pointsRef.current = points;
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

      const step = last === null ? 0 : ((now - last) / 1000) * speed;
      last = now;
      const next = advanceRobot(current, pointsRef.current, step);
      commit(next);

      if (next.mission?.targetId === null) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  // Posicionar/arrastar/remover na mão: o robô fica onde foi colocado
  // (mantém o rumo) e a ida em andamento é cancelada.
  function place(position: PathPoint | null) {
    setPlaying(false);
    commit(position ? { position, heading: robotRef.current?.heading ?? null, mission: null } : null);
  }

  // ▶: sem ida em andamento (ou a anterior já terminou), começa uma nova de
  // onde o robô está AGORA até o 1º ponto; pausada no meio, continua.
  function play() {
    const current = robotRef.current;
    const first = pointsRef.current[0];
    if (!current || !first) return;

    if (!current.mission || current.mission.targetId === null) {
      commit({
        ...current,
        mission: { origin: current.position, originHeading: current.heading, targetId: first.id, targetIndex: 0 },
      });
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

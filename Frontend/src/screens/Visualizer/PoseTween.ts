import { clamp } from '../Simulation/Service/SimPhysics';
import { normalizeAngle } from '../Simulation/Service/SimRobot';

/** Pose desenhada no mapa: mm (Y pra cima) e rumo em rad. */
export interface TweenPose {
  x: number;
  y: number;
  theta: number;
}

interface Track {
  from: TweenPose;
  to: TweenPose;
  start: number;
  duration: number;
  /** Quando chegou a última pose diferente (ms). */
  lastAt: number;
  /** Intervalo médio entre poses diferentes (ms), suavizado — a duração de cada deslize. */
  interval: number | null;
  shown: TweenPose;
}

/** Peso da amostra nova na média do intervalo: segura o jitter da rede sem demorar a se adaptar. */
const INTERVAL_SMOOTHING = 0.2;
/** Faixa da duração do deslize (ms). Intervalo maior que o teto (rádio perdeu pacotes, robô ficou parado) entra na média já cortado nele. */
const MIN_DURATION_MS = 30;
const MAX_DURATION_MS = 600;
/**
 * Salto maior que isso (mm) entre duas poses = robô recolocado à mão ou a
 * localização se perdeu e voltou longe: aparece direto, sem deslizar. Por
 * distância e não por tempo: com o rádio perdendo pacotes, um buraco de 1–2 s
 * é normal e o robô tem que continuar deslizando (como o useSmoothPositions do
 * PyDotBot).
 */
const SNAP_DISTANCE_MM = 1000;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function samePose(a: TweenPose, b: TweenPose): boolean {
  return a.x === b.x && a.y === b.y && a.theta === b.theta;
}

function poseAt(track: Track, now: number): TweenPose {
  const t = track.duration > 0 ? clamp((now - track.start) / track.duration, 0, 1) : 1;
  const { from, to } = track;
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    // Pelo menor arco: de 170° pra -170° gira 20°, não 340°.
    theta: from.theta + normalizeAngle(to.theta - from.theta) * t,
  };
}

// Suaviza a pose dos robôs da API entre uma amostra e outra. A telemetria
// chega em degraus (10 Hz no simulador, 2 Hz no robô real, com perdas do
// rádio); a cada pose nova o robô desliza da pose desenhada agora até ela,
// durante o intervalo médio entre poses. Amostra repetida (a LH2 não leu de
// novo) não conta: o deslize seguinte cobre o tempo todo desde a última pose
// diferente, em vez de parar e depois correr. Custo: o desenho fica até uma
// amostra atrás do dado. Sem React: quem desenha chama `advance(now)` a cada
// quadro e lê `pose()`.
export class PoseTween {
  private tracks = new Map<string, Track>();

  /** Amostra nova de `key`, recebida em `now` (ms). */
  push(key: string, target: TweenPose, now: number): void {
    const track = this.tracks.get(key);
    if (!track) {
      this.tracks.set(key, { from: target, to: target, start: now, duration: 0, lastAt: now, interval: null, shown: target });
      return;
    }
    
    if (samePose(track.to, target)) return;

    if (Math.hypot(target.x - track.to.x, target.y - track.to.y) > SNAP_DISTANCE_MM) {
    
      this.tracks.set(key, {
          ...track,
          from: target,
          to: target,
          start: now,
          duration: 0,
          lastAt: now,
          shown: target
        });
      return;
    
    }
    
    const sample = Math.min(now - track.lastAt, MAX_DURATION_MS);
    
    const interval = track.interval === null ? sample : lerp(track.interval, sample, INTERVAL_SMOOTHING);
    
    const from = poseAt(track, now);
    
    this.tracks.set(key, {
      from,
      to: target,
      start: now,
      duration: clamp(interval, MIN_DURATION_MS, MAX_DURATION_MS),
      lastAt: now,
      interval,
      shown: from,
    });
  }

  /** Recalcula a pose desenhada de todos em `now`. Devolve true se algum ainda está deslizando. */
  advance(now: number): boolean {
    let moving = false;
    for (const track of this.tracks.values()) {
      track.shown = poseAt(track, now);
      if (now < track.start + track.duration) moving = true;
    }
    return moving;
  }

  /** Pose desenhada no último `advance` (null = nunca chegou amostra). */
  pose(key: string): TweenPose | null {
    return this.tracks.get(key)?.shown ?? null;
  }

  clear(): void {
    this.tracks.clear();
  }
}

import type { SimArenaModel, SimObstacleModel, Vec2Model } from '../../model/SimWorld.Model';

// Colisão de baixa fidelidade — porte do RobotSwarmSimulator
// (src/core/physics.ts): robô = círculo, obstáculo = AABB. Se a posição
// proposta no tick colide, o movimento é bloqueado (a pose volta pra
// anterior). Sem resposta física (sem empurrão/deslize).

/** Limita v a [lo, hi] — usado também pelo controlador AUTO e pelo joystick. */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Interseção círculo × retângulo (ponto mais próximo do AABB). */
export function circleIntersectsRect(center: Vec2Model, radius: number, o: SimObstacleModel): boolean {
  const nx = clamp(center.x, o.x, o.x + o.w);
  const ny = clamp(center.y, o.y, o.y + o.h);
  const dx = center.x - nx;
  const dy = center.y - ny;
  return dx * dx + dy * dy < radius * radius;
}

export function collidesAny(center: Vec2Model, radius: number, obstacles: SimObstacleModel[]): boolean {
  return obstacles.some((o) => circleIntersectsRect(center, radius, o));
}

/** Trava nas bordas da arena e, se a posição proposta colidir com um obstáculo, mantém a anterior. */
export function resolveMovement(
  prev: Vec2Model,
  next: Vec2Model,
  radius: number,
  obstacles: SimObstacleModel[],
  arena: SimArenaModel,
): Vec2Model {
  const clamped: Vec2Model = {
    x: clamp(next.x, radius, arena.width - radius),
    y: clamp(next.y, radius, arena.height - radius),
  };
  if (collidesAny(clamped, radius, obstacles)) {
    return { x: prev.x, y: prev.y };
  }
  return clamped;
}

// Colisão robô × robô: dois robôs colidem quando a distância entre centros é
// menor que 2·raio. Resolvido por SEPARAÇÃO posicional (metade da
// sobreposição pra cada um) — respeita as bordas e nunca empurra ninguém pra
// dentro de um obstáculo.

export interface CircleBody {
  x: number;
  y: number;
}

function tryNudge(body: CircleBody, mx: number, my: number, radius: number, obstacles: SimObstacleModel[], arena: SimArenaModel): void {
  const nx = clamp(body.x + mx, radius, arena.width - radius);
  const ny = clamp(body.y + my, radius, arena.height - radius);
  if (collidesAny({ x: nx, y: ny }, radius, obstacles)) return;
  body.x = nx;
  body.y = ny;
}

/** Separa robôs sobrepostos (in place), em algumas iterações pra estabilizar aglomerados. Determinístico. */
export function separateRobots(
  bodies: CircleBody[],
  radius: number,
  obstacles: SimObstacleModel[],
  arena: SimArenaModel,
  iterations = 4,
): void {
  const minDist = radius * 2;
  for (let it = 0; it < iterations; it++) {
    let anyOverlap = false;
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist >= minDist) continue;
        anyOverlap = true;
        if (dist < 1e-6) {
          dx = 1;
          dy = 0;
          dist = 1e-6;
        }
        const push = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        tryNudge(a, -nx * push, -ny * push, radius, obstacles, arena);
        tryNudge(b, nx * push, ny * push, radius, obstacles, arena);
      }
    }
    if (!anyOverlap) break;
  }
}

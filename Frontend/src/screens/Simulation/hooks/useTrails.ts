import type { Vec2Model } from '../../../model/SimWorld.Model';

/** Quantos pontos o rastro de cada robô guarda (os mais recentes). */
const TRAIL_MAX_POINTS = 400;
/** Distância mínima entre dois pontos do rastro (mm) — menos que isso é robô parado/ruído. */
const TRAIL_MIN_DIST_MM = 8;

/**
 * Soma a posição (mm) ao rastro recente do robô, descartando ponto muito
 * perto do último — o rastro desenhado pelo SimOverlay na Simulação (pose
 * simulada) e no Visualizador (telemetria da API).
 */
export function pushTrailPoint(trails: Map<string, Vec2Model[]>, address: string, p: Vec2Model): void {
  let trail = trails.get(address);
  if (!trail) {
    trail = [];
    trails.set(address, trail);
  }
  const last = trail[trail.length - 1];
  if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= TRAIL_MIN_DIST_MM) {
    trail.push(p);
    if (trail.length > TRAIL_MAX_POINTS) trail.splice(0, trail.length - TRAIL_MAX_POINTS);
  }
}

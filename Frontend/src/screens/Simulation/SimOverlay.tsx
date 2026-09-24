import { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import type { SimMapRobotModel } from '../../model/SimRobot.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';
import type { MapScale } from './useMapGeometry';
import { toPx } from './useMapGeometry';
import styles from './SimulationMap.module.css';

interface SimOverlayProps {
  scale: MapScale;
  robots: SimMapRobotModel[];
  trails?: ReadonlyMap<string, readonly Vec2Model[]>;
  /** Editar: rotas desenhadas a partir da pose inicial, esmaecidas em MANUAL. Simular: só AUTO, do ponto atual em diante. */
  editable: boolean;
  /** Robô cujos waypoints já são marcadores interativos (<Waypoint>) — aqui só a linha dele. */
  focusAddress: string | null;
  /** Rota em montagem no modo Simular (vira LH2_WAYPOINTS ao enviar). */
  routeDraft: { address: string; points: Vec2Model[] } | null;
  /** Rota de uma task em destaque (cartão Tarefas / seletor do Semi-auto). */
  taskPreview?: { from: Vec2Model | null; points: Vec2Model[] } | null;
}

const PREVIEW_COLOR = '#d63384'; // fora da paleta dos robôs e do laranja do rascunho

// Camada SVG (sem clique) com o que é "desenho" e não elemento de mapa:
// rastro recente de cada robô, rota do modo AUTO (tracejada, alvo atual
// destacado, fecha o circuito quando em loop) e a rota em montagem —
// mesmas informações do MapView do RobotSwarmSimulator.
export function SimOverlay({ scale, robots, trails, editable, focusAddress, routeDraft, taskPreview = null }: SimOverlayProps) {
  const px = (p: Vec2Model) => toPx(scale, p);
  const pts = (list: Vec2Model[]) => list.map((p) => { const q = px(p); return `${q.x},${q.y}`; }).join(' ');

  return (
    <svg className={styles.overlay}>
      {!editable &&
        robots.map((r) => {
          const trail = trails?.get(r.address);
          if (!trail || trail.length < 2) return null;
          return (
            <polyline
              key={`trail-${r.address}`}
              points={pts([...trail, { x: r.x, y: r.y }])}
              fill="none"
              stroke={r.color}
              strokeWidth={1.5}
              opacity={0.4}
            />
          );
        })}

      {robots.map((r) => {
        if (r.waypoints.length === 0) return null;
        const auto = r.mode === DotBotControlMode.Auto;
        if (!editable && !auto) return null;

        const from = editable ? 0 : Math.min(r.waypointIdx, r.waypoints.length - 1);
        const line = [{ x: r.x, y: r.y }, ...r.waypoints.slice(from)];
        if (r.loop) line.push(r.waypoints[0]);
        const isFocus = r.address === focusAddress && editable;

        return (
          <g key={`route-${r.address}`} opacity={auto ? 1 : 0.35}>
            <polyline points={pts(line)} fill="none" stroke={r.color} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.7} />
            {!isFocus &&
              r.waypoints.map((wp, k) => {
                const q = px(wp);
                const reached = !editable && k < r.waypointIdx;
                const current = !editable && k === r.waypointIdx;
                return (
                  <g key={k}>
                    <circle cx={q.x} cy={q.y} r={current ? 5 : 3.5} fill={reached ? 'var(--color-text-muted)' : r.color} opacity={current ? 1 : 0.6} />
                    <text x={q.x + 6} y={q.y - 5} className={styles.waypointLabel}>
                      {k + 1}
                    </text>
                  </g>
                );
              })}
          </g>
        );
      })}

      {routeDraft && routeDraft.points.length > 0 && (() => {
        const owner = robots.find((r) => r.address === routeDraft.address);
        const line = owner ? [{ x: owner.x, y: owner.y }, ...routeDraft.points] : routeDraft.points;
        return <polyline points={pts(line)} fill="none" stroke="var(--color-orange)" strokeWidth={2} strokeDasharray="4 3" />;
      })()}
      {taskPreview && taskPreview.points.length > 0 && (
        <g>
          <polyline
            points={pts(taskPreview.from ? [taskPreview.from, ...taskPreview.points] : taskPreview.points)}
            fill="none"
            stroke={PREVIEW_COLOR}
            strokeWidth={2.5}
            strokeDasharray="8 4"
            opacity={0.85}
          />
          {taskPreview.points.map((wp, k) => {
            const q = px(wp);
            return (
              <g key={`preview-${k}`}>
                <circle cx={q.x} cy={q.y} r={4.5} fill={PREVIEW_COLOR} />
                <text x={q.x + 6} y={q.y - 5} className={styles.waypointLabel}>
                  {k + 1}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

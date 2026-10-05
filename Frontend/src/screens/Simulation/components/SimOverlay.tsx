import { Fragment } from 'react';
import { RobotPath } from '../../components/RobotPath/RobotPath';
import { Waypoint } from '../../components/Waypoint/Waypoint';
import { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
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
const REACHED_COLOR = 'var(--color-text-muted)';

// Desenhos (sem clique) por cima do mapa: rastro recente de cada robô (SVG
// próprio) e as rotas pelo <RobotPath>, em px:
//   - Simular: rota de cada robô em AUTO no mesmo desenho da tela de Tarefas
//     (linha com setas + <Waypoint> numerado), na cor do robô, saindo da
//     posição dele; ponto já alcançado em cinza; fecha o circuito em loop;
//   - Editar: rota tracejada com círculos numerados (a do robô em foco só a
//     linha — os pontos dela são <Waypoint> arrastáveis no SimulationMap);
//   - rota em montagem (laranja) e preview de tarefa (rosa).
export function SimOverlay({ scale, robots, trails, editable, focusAddress, routeDraft, taskPreview = null }: SimOverlayProps) {
  const px = (p: Vec2Model) => toPx(scale, p);
  const pts = (list: Vec2Model[]) => list.map((p) => { const q = px(p); return `${q.x},${q.y}`; }).join(' ');
  const path = (list: Vec2Model[]) => list.map((p, orderIndex) => ({ orderIndex, ...px(p) }));

  const draftOwner = routeDraft ? robots.find((r) => r.address === routeDraft.address) : undefined;

  return (
    <>
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
      </svg>

      {robots.map((r) => {
        if (r.waypoints.length === 0) return null;
        const auto = r.mode === DotBotControlMode.Auto;
        if (!editable && !auto) return null;
        const routeColor = SimRobotMapper.displayColor(r); // mesma cor do círculo do robô (LED quando aceso)
        if (!editable) {
          return (
            <Fragment key={`route-${r.address}`}>
              <RobotPath
                units="px"
                cellSize={1}
                variant="arrows"
                points={path(r.waypoints)}
                from={px({ x: r.x, y: r.y })}
                reachedCount={r.waypointIdx}
                closed={r.loop}
                color={routeColor}
              />
              {r.waypoints.map((wp, k) => {
                const q = px(wp);
                return (
                  <Waypoint
                    key={k}
                    x={q.x}
                    y={q.y}
                    order={k + 1}
                    color={k < r.waypointIdx ? REACHED_COLOR : routeColor}
                    selectable={false}
                    className={styles.routeMarker}
                  />
                );
              })}
            </Fragment>
          );
        }
        return (
          <RobotPath
            key={`route-${r.address}`}
            units="px"
            cellSize={1}
            points={path(r.waypoints)}
            from={px({ x: r.x, y: r.y })}
            reachedCount={editable ? 0 : r.waypointIdx}
            closed={r.loop}
            color={routeColor}
            // Editar: o robô em foco já tem os <Waypoint> interativos — aqui só a linha.
            markers={!(editable && r.address === focusAddress)}
            className={auto ? undefined : styles.routeFaded}
          />
        );
      })}

      {routeDraft && routeDraft.points.length > 0 && (
        // Os pontos do rascunho já são <Waypoint> arrastáveis (SimulationMap) — aqui só a linha.
        <RobotPath
          units="px"
          cellSize={1}
          points={path(routeDraft.points)}
          from={draftOwner ? px({ x: draftOwner.x, y: draftOwner.y }) : undefined}
          markers={false}
        />
      )}

      {taskPreview && taskPreview.points.length > 0 && (
        <RobotPath
          units="px"
          cellSize={1}
          points={path(taskPreview.points)}
          from={taskPreview.from ? px(taskPreview.from) : undefined}
          color={PREVIEW_COLOR}
        />
      )}
    </>
  );
}

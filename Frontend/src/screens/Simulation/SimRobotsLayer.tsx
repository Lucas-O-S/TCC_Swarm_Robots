import type { ReactNode } from 'react';
import { Waypoint } from '../../components/Waypoint/Waypoint';
import type { ElementBounds } from '../../hooks/useSelectableElements';
import type { SimMapRobotModel } from '../../model/SimRobot.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';
import { SimOverlay } from './SimOverlay';
import { SimRobotMarker } from './SimRobotMarker';
import { fromPx, screenTheta, toPx } from './useMapGeometry';
import type { MapScale } from './useMapGeometry';
import type { RouteDraft } from './useRouteDraft';
import { draftSelId } from './useSimSelection';
import styles from './SimulationMap.module.css';

interface SimRobotsLayerProps {
  scale: MapScale;
  robots: SimMapRobotModel[];
  trails?: ReadonlyMap<string, readonly Vec2Model[]>;
  /** Modo Editar da Simulação: rotas tracejadas e robôs arrastáveis. */
  editable: boolean;
  focusAddress: string | null;
  routeDraft: RouteDraft | null;
  taskPreview?: { from: Vec2Model | null; points: Vec2Model[] } | null;
  onMoveRobot: (address: string, pos: Vec2Model) => void;
  onRemoveRobot: (address: string) => void;
  onMoveDraftPoint: (index: number, pos: Vec2Model) => void;
  onRemoveDraftPoint: (index: number) => void;
  /** Desenhado entre as rotas e os robôs (ex.: os waypoints arrastáveis do modo Editar). */
  children?: ReactNode;
}

// Camada dos robôs por cima do mapa, a mesma na Simulação (SimulationMap) e
// no Visualizador (VisualizerMap): rastros e rotas (SimOverlay), a rota
// avulsa em montagem (laranja, arrastável — fora do Editar) e os robôs
// (SimRobotMarker), com a seta corrigida pra escala de cada eixo.
export function SimRobotsLayer({
  scale,
  robots,
  trails,
  editable,
  focusAddress,
  routeDraft,
  taskPreview = null,
  onMoveRobot,
  onRemoveRobot,
  onMoveDraftPoint,
  onRemoveDraftPoint,
  children,
}: SimRobotsLayerProps) {
  const shown = robots.map((r) => ({ ...r, theta: screenTheta(r.theta, scale) }));

  return (
    <>
      <SimOverlay
        scale={scale}
        robots={shown}
        trails={trails}
        editable={editable}
        focusAddress={focusAddress}
        routeDraft={routeDraft}
        taskPreview={taskPreview}
      />

      {children}

      {/* Rota em montagem (vira LH2_WAYPOINTS quando enviada pelo drawer do robô). */}
      {!editable &&
        routeDraft?.points.map((p, index) => {
          const c = toPx(scale, p);
          return (
            <Waypoint
              key={draftSelId(index)}
              id={draftSelId(index)}
              order={index + 1}
              color="var(--color-orange)"
              x={c.x}
              y={c.y}
              movable
              onMove={(next) => onMoveDraftPoint(index, fromPx(scale, next))}
              removable
              onRemove={() => onRemoveDraftPoint(index)}
              className={styles.draggable}
            />
          );
        })}

      {shown.map((robot) => (
        <SimRobotMarker key={robot.address} robot={robot} scale={scale} editable={editable} onMove={onMoveRobot} onRemove={onRemoveRobot} />
      ))}
    </>
  );
}

/** Prévia do ponto de rota enquanto a ferramenta Waypoint está ligada (laranja, sem clique). */
export function DraftPointPreview({ rect }: { rect: ElementBounds }) {
  return <Waypoint x={rect.x + rect.width / 2} y={rect.y + rect.height / 2} color="var(--color-orange)" className={styles.preview} />;
}

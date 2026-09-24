import type { ReactNode } from 'react';
import { MapCanvas } from '../../components/MapCanvas/MapCanvas';
import type { CellSelectRect } from '../../components/MapCanvas/MapCanvas';
import type { BaseTool } from '../../components/MapViewport/MapViewport';
import { Obstacle } from '../../components/Obstacle/Obstacle';
import { Waypoint } from '../../components/Waypoint/Waypoint';
import { CELL_MM } from '../../Consts/SimulationConsts';
import type { MapElementsController } from '../../hooks/useMapElements';
import type { ElementBounds } from '../../hooks/useSelectableElements';
import type { SimMapRobotModel } from '../../model/SimRobot.Model';
import type { SimObstacleModel, Vec2Model } from '../../model/SimWorld.Model';
import { fromPx, makeScale, toPx } from './useMapGeometry';
import type { MapScale } from './useMapGeometry';
import { draftSelId, obstacleSelId, waypointSelId } from './useSimSelection';
import { SimOverlay } from './SimOverlay';
import { SimRobotMarker } from './SimRobotMarker';
import styles from './SimulationMap.module.css';

interface SimulationMapProps {
  arena: { width: number; height: number };
  obstacles: SimObstacleModel[];
  robots: SimMapRobotModel[];
  trails?: ReadonlyMap<string, readonly Vec2Model[]>;
  editable: boolean;
  focusAddress: string | null;
  routeDraft: { address: string; points: Vec2Model[] } | null;
  /** Rota de uma task em destaque (só desenho, rosa) — `from` = posição do robô que vai fazer. */
  taskPreview?: { from: Vec2Model | null; points: Vec2Model[] } | null;
  maxHeight?: number;
  elements: MapElementsController;
  className?: string;
  tool: string;
  onToolChange: (tool: BaseTool) => void;
  createTool?: string;
  onCreate: (rect: CellSelectRect) => void;
  renderCreatePreview: (rect: ElementBounds) => ReactNode;
  tools: ReactNode;
  panel: ReactNode;
  onMoveObstacle: (id: string, pos: Vec2Model) => void;
  onRemoveObstacle: (id: string) => void;
  onMoveRobot: (address: string, pos: Vec2Model) => void;
  onRemoveRobot: (address: string) => void;
  onMoveWaypoint: (address: string, index: number, pos: Vec2Model) => void;
  onRemoveWaypoint: (address: string, index: number) => void;
  onMoveDraftPoint: (index: number, pos: Vec2Model) => void;
  onRemoveDraftPoint: (index: number) => void;
}

// Mapa 2D (topo) da simulação sobre o <MapCanvas> do app — mesmo grid,
// zoom/arraste, ferramentas e seleção do Construtor de Cenários e do de
// Tarefas. O mundo é em mm com Y pra cima (convenção do simulador); a
// conversão pra px fica em useMapGeometry.ts. Obstáculos e robôs "derivam"
// da entidade de seleção compartilhada (ver src/hooks/useMapElements.tsx):
// no modo Editar dá pra mover/apagar; no Simular só selecionar (a posição
// vem da física).
export function SimulationMap({
  arena,
  obstacles,
  robots,
  trails,
  editable,
  focusAddress,
  routeDraft,
  taskPreview = null,
  maxHeight,
  elements,
  className,
  tool,
  onToolChange,
  createTool,
  onCreate,
  renderCreatePreview,
  tools,
  panel,
  onMoveObstacle,
  onRemoveObstacle,
  onMoveRobot,
  onRemoveRobot,
  onMoveWaypoint,
  onRemoveWaypoint,
  onMoveDraftPoint,
  onRemoveDraftPoint,
}: SimulationMapProps) {
  const focusRobot = focusAddress ? robots.find((r) => r.address === focusAddress) : undefined;

  function renderContent(scale: MapScale) {
    return (
      <>
        {obstacles.map((o) => {
          const topLeft = toPx(scale, { x: o.x, y: o.y + o.h });
          return (
            <Obstacle
              key={o.id}
              id={obstacleSelId(o.id)}
              label={o.id}
              title={editable ? `${o.id} (Backspace remove)` : o.id}
              x={topLeft.x}
              y={topLeft.y}
              width={o.w * scale.sx}
              height={o.h * scale.sy}
              selectable={editable}
              movable={editable}
              onMove={(next) => {
                const p = fromPx(scale, next);
                onMoveObstacle(o.id, { x: p.x, y: p.y - o.h });
              }}
              removable={editable}
              onRemove={() => onRemoveObstacle(o.id)}
              className={editable ? styles.draggable : undefined}
            />
          );
        })}

        <SimOverlay
          scale={scale}
          robots={robots}
          trails={trails}
          editable={editable}
          focusAddress={focusAddress}
          routeDraft={routeDraft}
          taskPreview={taskPreview}
        />

        {/* Rota do robô em foco no modo Editar: marcadores numerados, arrastáveis e apagáveis (TaskBuilder). */}
        {editable &&
          focusRobot?.waypoints.map((wp, index) => {
            const c = toPx(scale, wp);
            return (
              <Waypoint
                key={waypointSelId(focusRobot.address, index)}
                id={waypointSelId(focusRobot.address, index)}
                order={index + 1}
                color={focusRobot.color}
                x={c.x}
                y={c.y}
                movable
                onMove={(next) => onMoveWaypoint(focusRobot.address, index, fromPx(scale, next))}
                removable
                onRemove={() => onRemoveWaypoint(focusRobot.address, index)}
                className={styles.draggable}
              />
            );
          })}

        {/* Rota em montagem no modo Simular (vira LH2_WAYPOINTS quando enviada pelo drawer do robô). */}
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

        {robots.map((robot) => (
          <SimRobotMarker
            key={robot.address}
            robot={robot}
            scale={scale}
            editable={editable}
            onMove={onMoveRobot}
            onRemove={onRemoveRobot}
          />
        ))}
      </>
    );
  }

  const cols = arena.width / CELL_MM;
  const rows = arena.height / CELL_MM;

  // Diferente do CenarioBuilder/TaskBuilder, a célula aqui fica SEMPRE
  // quadrada: é física — com célula esticada o rumo desenhado (theta) não
  // bate com a direção em que o robô anda na tela. Em vez de passar
  // `maxHeight` pro <MapCanvas> (que estica a célula), a largura disponível
  // é limitada pra que o mapa quadrado caiba na altura da tela.
  return (
    <div style={{ maxWidth: maxHeight ? Math.floor((maxHeight * cols) / rows) : undefined }}>
      <MapCanvas
        cols={cols}
        rows={rows}
        fitWidth
        elements={elements}
        className={className}
        tool={tool}
        onToolChange={onToolChange}
        createTool={createTool}
        onCreateElement={onCreate}
        renderCreatePreview={renderCreatePreview}
        tools={tools}
        panel={panel}
      >
        {(cellWidth, cellHeight) => renderContent(makeScale(cellWidth, cellHeight, arena.height))}
      </MapCanvas>
    </div>
  );
}

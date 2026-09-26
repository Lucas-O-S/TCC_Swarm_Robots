import type { ReactNode } from 'react';
import { MapCanvas } from '../../components/MapCanvas/MapCanvas';
import type { CellSelectRect } from '../../components/MapCanvas/MapCanvas';
import type { BaseTool } from '../../components/MapViewport/MapViewport';
import { Obstacle } from '../../components/Obstacle/Obstacle';
import { Waypoint } from '../../components/Waypoint/Waypoint';
import { CELL_MM } from '../../Consts/SimulationConsts';
import type { MapElementsController } from '../../hooks/useMapElements';
import type { ElementBounds } from '../../hooks/useSelectableElements';
import type { CenarioModel } from '../../model/Cenario.Model';
import type { SimMapRobotModel } from '../../model/SimRobot.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';
import { SimOverlay } from '../Simulation/SimOverlay';
import { SimRobotMarker } from '../Simulation/SimRobotMarker';
import { fromPx, makeScale, toPx } from '../Simulation/useMapGeometry';
import type { MapScale } from '../Simulation/useMapGeometry';
import { draftSelId } from '../Simulation/useSimSelection';
import mapStyles from '../Simulation/SimulationMap.module.css';

interface VisualizerMapProps {
  /** Cenário pronto, no formato do Construtor: células, Y pra baixo. */
  cenario: CenarioModel;
  /** Robôs da API, em mm com Y pra cima (convenção LH2). */
  robots: SimMapRobotModel[];
  trails: ReadonlyMap<string, readonly Vec2Model[]>;
  focusAddress: string | null;
  routeDraft: { address: string; points: Vec2Model[] } | null;
  taskPreview: { from: Vec2Model | null; points: Vec2Model[] } | null;
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
  onMoveDraftPoint: (index: number, pos: Vec2Model) => void;
  onRemoveDraftPoint: (index: number) => void;
}

const noop = () => {};

/** Rumo no mundo → rumo na tela: com a célula esticada, a seta aponta pra onde o robô anda NO MAPA. */
function screenTheta(theta: number, scale: MapScale): number {
  return Math.atan2(Math.sin(theta) * scale.sy, Math.cos(theta) * scale.sx);
}

// Mapa do Visualizador. Os blocos funcionam como na tela de gerar mapa
// (Construtor de Cenários e Tarefas): cenário em células, obstáculos por
// célula e a célula esticando pra preencher a altura (fitWidth + maxHeight
// no <MapCanvas>), diferente da Simulação, que trava a célula quadrada.
// Por cima vai o que chega da API em mm, convertido pra px pela escala de
// cada eixo (useMapGeometry): robôs, rastros e rotas com os mesmos desenhos
// da Simulação (SimRobotMarker, SimOverlay). Nada do mapa se edita aqui;
// só a rota avulsa (laranja) é montada e arrastada.
export function VisualizerMap({
  cenario,
  robots,
  trails,
  focusAddress,
  routeDraft,
  taskPreview,
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
  onMoveDraftPoint,
  onRemoveDraftPoint,
}: VisualizerMapProps) {
  function renderContent(cellWidth: number, cellHeight: number) {
    const scale = makeScale(cellWidth, cellHeight, cenario.sizeY * CELL_MM);
    const shown = robots.map((r) => ({ ...r, theta: screenTheta(r.theta, scale) }));

    return (
      <>
        {/* Sem id: só desenho, igual ao Construtor mas sem seleção/arrasto. */}
        {cenario.Obstacles.map((o) => (
          <Obstacle
            key={o.id}
            label={o.name}
            x={o.startPointX * cellWidth}
            y={o.startPointY * cellHeight}
            width={o.sizeX * cellWidth}
            height={o.sizeY * cellHeight}
          />
        ))}

        <SimOverlay
          scale={scale}
          robots={shown}
          trails={trails}
          editable={false}
          focusAddress={focusAddress}
          routeDraft={routeDraft}
          taskPreview={taskPreview}
        />

        {/* Rota avulsa em montagem (vira LH2_WAYPOINTS quando enviada pelo drawer do robô). */}
        {routeDraft?.points.map((p, index) => {
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
              className={mapStyles.draggable}
            />
          );
        })}

        {shown.map((robot) => (
          <SimRobotMarker key={robot.address} robot={robot} scale={scale} editable={false} onMove={noop} onRemove={noop} />
        ))}
      </>
    );
  }

  return (
    <MapCanvas
      cols={cenario.sizeX}
      rows={cenario.sizeY}
      fitWidth
      maxHeight={maxHeight}
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
      {renderContent}
    </MapCanvas>
  );
}

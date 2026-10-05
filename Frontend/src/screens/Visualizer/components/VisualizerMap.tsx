import type { ReactNode } from 'react';
import { MapCanvas } from '../../../components/MapCanvas/MapCanvas';
import type { CellSelectRect } from '../../../components/MapCanvas/MapCanvas';
import type { BaseTool } from '../../../components/MapViewport/MapViewport';
import { Obstacle } from '../../../components/Obstacle/Obstacle';
import { CELL_MM } from '../../../Consts/SimulationConsts';
import type { MapElementsController } from '../../../hooks/useMapElements';
import type { ElementBounds } from '../../../hooks/useSelectableElements';
import type { CenarioModel } from '../../../model/Cenario.Model';
import type { SimMapRobotModel } from '../../../model/SimRobot.Model';
import type { Vec2Model } from '../../../model/SimWorld.Model';
import { SimRobotsLayer } from '../../Simulation/components/SimRobotsLayer';
import { makeScale } from '../../Simulation/hooks/useMapGeometry';
import type { RouteDraft } from '../../Simulation/hooks/useRouteDraft';

interface VisualizerMapProps {
  /** Cenário pronto, no formato do Construtor: células, Y pra baixo. */
  cenario: CenarioModel;
  /** Robôs da API, em mm com Y pra cima (convenção LH2). */
  robots: SimMapRobotModel[];
  trails: ReadonlyMap<string, readonly Vec2Model[]>;
  focusAddress: string | null;
  routeDraft: RouteDraft | null;
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

// Mapa do Visualizador. Os blocos funcionam como na tela de gerar mapa
// (Construtor de Cenários e Tarefas): cenário em células, obstáculos por
// célula e a célula esticando pra preencher a altura (fitWidth + maxHeight
// no <MapCanvas>), diferente da Simulação, que trava a célula quadrada.
// Por cima vai a camada de robôs da Simulação (SimRobotsLayer: robôs,
// rastros, rotas e rascunho), com o que chega da API em mm convertido pra px
// pela escala de cada eixo. Nada do mapa se edita aqui; só a rota avulsa
// (laranja) é montada e arrastada.
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
      {(cellWidth, cellHeight) => (
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

          <SimRobotsLayer
            scale={makeScale(cellWidth, cellHeight, cenario.sizeY * CELL_MM)}
            robots={robots}
            trails={trails}
            editable={false}
            focusAddress={focusAddress}
            routeDraft={routeDraft}
            taskPreview={taskPreview}
            onMoveRobot={noop}
            onRemoveRobot={noop}
            onMoveDraftPoint={onMoveDraftPoint}
            onRemoveDraftPoint={onRemoveDraftPoint}
          />
        </>
      )}
    </MapCanvas>
  );
}

import { useState } from 'react';
import { GatewayLog } from '../../components/GatewayLog/GatewayLog';
import type { Notice } from '../../components/HeaderBar/HeaderBar';
import type { CellSelectRect } from '../../components/MapCanvas/MapCanvas';
import { MapMenuLayout } from '../../components/MapMenuLayout/MapMenuLayout';
import { MapPlaceholder } from '../../components/MapPlaceholder/MapPlaceholder';
import { MapToolButton } from '../../components/MapToolButton/MapToolButton';
import { WaypointIcon } from '../../components/MapToolButton/icons';
import type { BaseTool } from '../../components/MapViewport/MapViewport';
import { Menu } from '../../components/Menu/Menu';
import { MenuColumns } from '../../components/MenuColumns/MenuColumns';
import { SelectReadyMapModal } from '../../components/SelectReadyMapModal/SelectReadyMapModal';
import { TaskPanel } from '../../components/TaskPanel/TaskPanel';
import { VisRobotDrawer } from '../../components/VisRobotDrawer/VisRobotDrawer';
import { VisRobotList } from '../../components/VisRobotList/VisRobotList';
import { VisualizerControls } from '../../components/VisualizerControls/VisualizerControls';
import { CELL_MM, ROBOT_RADIUS_MM } from '../../Consts/SimulationConsts';
import { RobotControlMode } from '../../enums/RobotControlMode.enum';
import { TaskStatus } from '../../enums/TaskStatus.enum';
import { MapElementsProvider, useMapElementsState } from '../../hooks/useMapElements';
import { ORCHESTRATOR_RUN_S } from '../../Integration/LocalOrchestrator';
import { ScenarioMapper } from '../../mapper/Scenario.Mapper';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import { TaskMapper } from '../../mapper/Task.Mapper';
import { VisRobotMapper } from '../../mapper/VisRobot.Mapper';
import type { SimMapRobotModel } from '../../model/SimRobot.Model';
import type { SimObstacleModel, Vec2Model } from '../../model/SimWorld.Model';
import type { VisRobotModel } from '../../model/VisRobot.Model';
import { collidesAny } from '../Simulation/Service/SimPhysics';
import { DraftPointPreview } from '../Simulation/components/SimRobotsLayer';
import { cellPointToWorld, clampPointToArena } from '../Simulation/hooks/useMapGeometry';
import { POINT_IN_OBSTACLE_NOTICE, routeToolTitle, useRouteDraft } from '../Simulation/hooks/useRouteDraft';
import { useStickyFocus } from '../Simulation/hooks/useSimSelection';
import mapStyles from '../Simulation/components/SimulationMap.module.css';
import { useVisualizer } from './hooks/useVisualizer';
import { VisualizerMap } from './components/VisualizerMap';

type Tool = BaseTool | 'waypoint';

// Tela do Visualizador — parecida com a Simulação e montada com as mesmas
// peças (MapMenuLayout, HeaderBar, camada de robôs do mapa, lista de robôs,
// painel de tarefas, log e as seções do drawer do robô), mas sem
// customização nenhuma e sem simular nada: roda ligada na rede, só com
// cenário pronto (por enquanto o mapa mock) e só com os robôs que vierem da
// API, que dá pra acompanhar e comandar do mesmo jeito que na Simulação
// (modo, joystick, rota avulsa, tarefa no Semi-auto, LED). Os blocos do
// mapa seguem a tela de gerar mapa (ver VisualizerMap).
//
// A conexão com a API ainda não existe: o useVisualizer usa o
// DisconnectedApiLink, então a tela abre só com o mapa e sem robôs.
export function Visualizer() {
  const vis = useVisualizer();
  const mapElements = useMapElementsState();
  const selection = mapElements.contextValue;
  const routeDraft = useRouteDraft();

  const [tool, setTool] = useState<Tool>('move');
  const [pickerOpen, setPickerOpen] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  /** Tarefa cuja rota aparece no mapa (cartão Tarefas ou seletor do Semi-auto). */
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);

  const cenario = vis.cenario;
  // O cenário é em células (formato do Construtor); a telemetria é em mm. A
  // arena e os obstáculos em mm servem pra encaixar ponto de rota e avisar
  // quando ele cai numa barreira.
  const arena = cenario ? { width: cenario.sizeX * CELL_MM, height: cenario.sizeY * CELL_MM } : { width: CELL_MM, height: CELL_MM };
  const obstacles: SimObstacleModel[] = cenario
    ? ScenarioMapper.fromMap({ cenario, robots: [] }).obstacles.map((o) => ({ id: o.id, x: o.x_mm, y: o.y_mm, w: o.w_mm, h: o.h_mm }))
    : [];
  const connected = vis.link.status === 'connected';
  const clampPoint = (p: Vec2Model) => clampPointToArena(p, arena);

  const tasksById = new Map(vis.tasks.map((t) => [t.uuid, t]));
  const taskOf = (v: VisRobotModel) => (v.robot.taskId ? (tasksById.get(v.robot.taskId) ?? null) : null);

  const mapRobots: SimMapRobotModel[] = vis.robots.flatMap((v, i) => {
    const task = taskOf(v);
    const robot = VisRobotMapper.toMap(v, i, arena, task ? TaskMapper.routePoints(task) : null);
    return robot ? [robot] : [];
  });
  const rows = vis.robots.map((v, i) => VisRobotMapper.toRow(v, i, cenario ? arena : null, taskOf(v)?.name ?? null));

  // ---- robô em foco (drawer + ferramenta Waypoint) — mesma regra da Simulação ----------
  const stickyAddress = useStickyFocus(selection.selectedIds, routeDraft.draft?.address ?? null, tool === 'waypoint');
  const focusIndex = vis.robots.findIndex((v) => v.robot.address === stickyAddress);
  const focus = focusIndex >= 0 ? vis.robots[focusIndex] : null;
  const focusAddress = focus?.robot.address ?? null;
  const focusLabel = focusIndex >= 0 ? SimRobotMapper.label(focusIndex) : '';
  // Rota avulsa (LH2_WAYPOINTS montado no mapa) só no modo Manual; em Semi-auto/Auto o robô segue tarefas.
  const canDraftForRobot = focus !== null && focus.robot.mode === RobotControlMode.Manual;
  const visibleDraft = routeDraft.visibleFor(focusAddress);

  // ---- helpers ------------------------------------------------------------------------

  function pickMockScenario() {
    selection.clearSelection();
    setTool('move');
    routeDraft.clear();
    setPreviewTaskId(null);
    setNotice(null);
    vis.loadMockScenario();
    setPickerOpen(false);
  }

  function handleCreate(rect: CellSelectRect) {
    if (tool !== 'waypoint' || !canDraftForRobot || !focusAddress) return;
    const p = clampPoint(cellPointToWorld(rect, arena.height));
    setNotice(collidesAny(p, ROBOT_RADIUS_MM, obstacles) ? { kind: 'error', text: POINT_IN_OBSTACLE_NOTICE } : null);
    routeDraft.add(focusAddress, p);
  }

  function stopDraft() {
    routeDraft.clear();
    setTool('move');
  }

  function closeDrawer() {
    selection.clearSelection();
    if (tool === 'waypoint') setTool('move');
  }

  function robotOfTask(taskId: string): string | null {
    const i = vis.robots.findIndex((v) => v.robot.taskId === taskId);
    return i >= 0 ? SimRobotMapper.label(i) : null;
  }

  // ---- ferramenta no canto do mapa (só a rota avulsa: o mapa não se edita aqui) -----------

  const tools = (
    <MapToolButton
      active={tool === 'waypoint'}
      onClick={() => setTool(tool === 'waypoint' ? 'move' : 'waypoint')}
      disabled={!canDraftForRobot}
      title={routeToolTitle(canDraftForRobot, focusLabel, focus !== null)}
    >
      <WaypointIcon />
    </MapToolButton>
  );

  // ---- drawer do robô em foco ------------------------------------------------------------

  // Rota da tarefa em destaque (rosa). Vinda do seletor do Semi-auto, sai da
  // posição do robô em foco — é o caminho que ele vai fazer.
  const previewTask = previewTaskId ? (tasksById.get(previewTaskId) ?? null) : null;
  const focusPos = focus ? VisRobotMapper.position(focus.telemetry) : null;
  const taskPreview = previewTask
    ? {
        from: focusPos && focus?.robot.mode === RobotControlMode.SemiAuto ? focusPos : null,
        points: TaskMapper.routePoints(previewTask),
      }
    : null;

  const panel = (
    <VisRobotDrawer
      robot={focus}
      label={focusLabel}
      onClose={closeDrawer}
      now={vis.now}
      connected={connected}
      task={focus ? taskOf(focus) : null}
      pendingTasks={vis.tasks.filter((t) => t.status === TaskStatus.Pending)}
      routeDraft={visibleDraft?.points ?? []}
      onMoveRaw={(left, right) => (focusAddress ? vis.moveRaw(focusAddress, left, right) : Promise.resolve(null))}
      onMode={async (mode) => {
        if (!focusAddress) return null;
        const error = await vis.setMode(focusAddress, mode);
        if (!error && mode !== RobotControlMode.Manual) stopDraft(); // rota avulsa só existe no Manual
        return error;
      }}
      onRgb={(color) => (focusAddress ? vis.setRgb(focusAddress, color) : Promise.resolve(null))}
      onAssign={(taskId) => (focusAddress ? vis.assignTask(focusAddress, taskId) : Promise.resolve(null))}
      onPreviewTask={setPreviewTaskId}
      onThreshold={(mm) => (focusAddress ? vis.setThreshold(focusAddress, mm) : Promise.resolve(null))}
      onSendRoute={async (threshold) => {
        if (!focusAddress || !visibleDraft) return null;
        const error = await vis.sendWaypoints(focusAddress, visibleDraft.points, threshold);
        if (!error) stopDraft();
        return error;
      }}
      onClearRoute={routeDraft.clear}
      onResendRoute={() =>
        focus?.route ? vis.sendWaypoints(focus.robot.address, focus.route.points, focus.route.threshold) : Promise.resolve(null)
      }
    />
  );

  // ---- render ------------------------------------------------------------------------------

  const pending = vis.tasks.filter((t) => t.status === TaskStatus.Pending).length;
  const running = vis.tasks.filter((t) => t.status === TaskStatus.InProgress).length;

  const header = (
    <VisualizerControls
      scenarioName={cenario?.name ?? ''}
      size={cenario ? { cols: cenario.sizeX, rows: cenario.sizeY } : null}
      obstacleCount={obstacles.length}
      onChangeScenario={() => setPickerOpen(true)}
      link={vis.link}
      robotCount={vis.robots.length}
      fleetSummary={SimRobotMapper.statusSummary(vis.robots.map((v) => v.robot.status))}
      notice={notice}
    />
  );

  const menu = (
    <MenuColumns>
      <Menu title={`Robôs (${rows.length})`}>
        <VisRobotList robots={rows} connected={connected} />
      </Menu>

      <Menu title={`Tarefas (${vis.tasks.length})`}>
        <TaskPanel
          tasks={vis.tasks}
          summary={`${pending} pendente(s) · ${running} em andamento · fila do backend a cada ${ORCHESTRATOR_RUN_S} s`}
          summaryTitle={`O orquestrador do backend distribui a fila a cada ${ORCHESTRATOR_RUN_S} s`}
          summaryTone={connected ? 'on' : 'off'}
          hint="Vêm da API (GET /tasks). Clique numa pra ver a rota no mapa; pra atribuir, abra um robô em Semi-auto."
          emptyText={connected ? 'Nenhuma tarefa na API.' : 'Sem tarefas: elas vêm da API, que está sem conexão.'}
          robotOf={(t) => robotOfTask(t.uuid)}
          selectedId={previewTaskId}
          onSelect={setPreviewTaskId}
        />
      </Menu>

      <Menu title="Log da API">
        <GatewayLog entries={vis.logEntries} />
      </Menu>
    </MenuColumns>
  );

  return (
    <MapElementsProvider value={selection}>
      <SelectReadyMapModal
        open={pickerOpen || !cenario}
        closable={!!cenario}
        onClose={() => setPickerOpen(false)}
        title="Selecionar cenário do visualizador"
        description="O visualizador não monta nem edita cenário: escolha um pronto (arena e barreiras). Os robôs vêm só da API."
        savedTitle="Cenários salvos"
        savedEmptyText="Nenhum cenário disponível — a API ainda não tem rota de cenários."
        savedButtonLabel="Selecionar cenário"
        mockText="O mapa fixo do Construtor de Cenários (12×10 blocos, 2 obstáculos), sem robôs — eles aparecem conforme a API manda."
        onSelectMock={pickMockScenario}
      />

      <MapMenuLayout header={header} menu={menu} stickyMap>
        {(maxMapHeight) =>
          cenario ? (
            <VisualizerMap
              cenario={cenario}
              robots={mapRobots}
              trails={vis.trails}
              focusAddress={focusAddress}
              routeDraft={visibleDraft}
              taskPreview={taskPreview}
              maxHeight={maxMapHeight}
              elements={mapElements}
              className={tool === 'waypoint' ? mapStyles.editableGrid : undefined}
              tool={tool}
              onToolChange={setTool}
              createTool={tool === 'waypoint' ? tool : undefined}
              onCreate={handleCreate}
              renderCreatePreview={(rect) => <DraftPointPreview rect={rect} />}
              tools={tools}
              panel={panel}
              onMoveDraftPoint={(index, pos) => routeDraft.move(index, clampPoint(pos))}
              onRemoveDraftPoint={routeDraft.remove}
            />
          ) : (
            <MapPlaceholder height={maxMapHeight} />
          )
        }
      </MapMenuLayout>
    </MapElementsProvider>
  );
}

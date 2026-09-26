import { useRef, useState } from 'react';
import { GatewayLog } from '../../components/GatewayLog/GatewayLog';
import type { CellSelectRect } from '../../components/MapCanvas/MapCanvas';
import { MapMenuLayout } from '../../components/MapMenuLayout/MapMenuLayout';
import { MapToolButton } from '../../components/MapToolButton/MapToolButton';
import { WaypointIcon } from '../../components/MapToolButton/icons';
import type { BaseTool } from '../../components/MapViewport/MapViewport';
import { Menu } from '../../components/Menu/Menu';
import { MenuColumns } from '../../components/MenuColumns/MenuColumns';
import { SelectVisualizerScenarioModal } from '../../components/SelectVisualizerScenarioModal/SelectVisualizerScenarioModal';
import type { Notice } from '../../components/SimulationControls/SimulationControls';
import { VisRobotDrawer } from '../../components/VisRobotDrawer/VisRobotDrawer';
import { VisRobotList } from '../../components/VisRobotList/VisRobotList';
import { VisTaskPanel } from '../../components/VisTaskPanel/VisTaskPanel';
import { VisualizerControls } from '../../components/VisualizerControls/VisualizerControls';
import { Waypoint } from '../../components/Waypoint/Waypoint';
import { CELL_MM, POINT_SNAP_MM, ROBOT_RADIUS_MM } from '../../Consts/SimulationConsts';
import { RobotControlMode } from '../../enums/RobotControlMode.enum';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { TaskStatus } from '../../enums/TaskStatus.enum';
import { MapElementsProvider, useMapElementsState } from '../../hooks/useMapElements';
import type { ElementBounds } from '../../hooks/useSelectableElements';
import { ScenarioMapper } from '../../mapper/Scenario.Mapper';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import { VisRobotMapper } from '../../mapper/VisRobot.Mapper';
import type { SimMapRobotModel } from '../../model/SimRobot.Model';
import type { SimObstacleModel, Vec2Model } from '../../model/SimWorld.Model';
import type { TaskModel } from '../../model/Task.Model';
import type { VisRobotModel } from '../../model/VisRobot.Model';
import { collidesAny } from '../Simulation/SimPhysics';
import { snap } from '../Simulation/useMapGeometry';
import { hasDraftSelection, robotFromSelection } from '../Simulation/useSimSelection';
import mapStyles from '../Simulation/SimulationMap.module.css';
import { useVisualizer } from './useVisualizer';
import { VisualizerMap } from './VisualizerMap';
import styles from './Visualizer.module.css';

type Tool = BaseTool | 'waypoint';

/** Pontos da tarefa na ordem, ou null sem tarefa (a lista da API hoje vem sem pontos: fica vazia). */
function taskPoints(task: TaskModel | null): Vec2Model[] | null {
  if (!task) return null;
  return [...task.waypoints].sort((a, b) => a.orderIndex - b.orderIndex).map((w) => ({ x: w.x, y: w.y }));
}

// Tela do Visualizador — parecida com a Simulação (mesmo MapMenuLayout,
// header, cartões e drawer do robô), mas sem customização nenhuma e sem
// simular nada: roda ligada na rede, só com cenário pronto (por enquanto o
// mapa mock) e só com os robôs que vierem da API, que dá pra acompanhar e
// comandar do mesmo jeito que na Simulação (modo, joystick, rota avulsa,
// tarefa no Semi-auto, LED). Os blocos do mapa seguem a tela de gerar mapa
// (ver VisualizerMap).
//
// A conexão com a API ainda não existe: o useVisualizer usa o
// DisconnectedApiLink, então a tela abre só com o mapa e sem robôs.
export function Visualizer() {
  const vis = useVisualizer();
  const mapElements = useMapElementsState();
  const selection = mapElements.contextValue;
  const selectedIds = selection.selectedIds;

  const [tool, setTool] = useState<Tool>('move');
  const [pickerOpen, setPickerOpen] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [routeDraft, setRouteDraft] = useState<{ address: string; points: Vec2Model[] } | null>(null);
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

  const tasksById = new Map(vis.tasks.map((t) => [t.uuid, t]));
  const taskOf = (v: VisRobotModel) => (v.robot.taskId ? (tasksById.get(v.robot.taskId) ?? null) : null);

  const mapRobots: SimMapRobotModel[] = vis.robots.flatMap((v, i) => {
    const robot = VisRobotMapper.toMap(v, i, arena, taskPoints(taskOf(v)));
    return robot ? [robot] : [];
  });
  const rows = vis.robots.map((v, i) => VisRobotMapper.toRow(v, i, cenario ? arena : null, taskOf(v)?.name ?? null));

  // ---- robô em foco (drawer + ferramenta Waypoint) — mesma regra da Simulação ----------
  // Com a ferramenta Waypoint ligada o foco "gruda": clicar no mapa pra criar
  // ponto não pode perder o robô-alvo.
  const fromSelection =
    robotFromSelection(selectedIds) ?? (hasDraftSelection(selectedIds) ? (routeDraft?.address ?? null) : null);
  const stickyFocus = useRef<string | null>(null);
  if (fromSelection) stickyFocus.current = fromSelection;
  else if (tool !== 'waypoint') stickyFocus.current = null;
  const focusIndex = vis.robots.findIndex((v) => v.robot.address === stickyFocus.current);
  const focus = focusIndex >= 0 ? vis.robots[focusIndex] : null;
  const focusAddress = focus?.robot.address ?? null;
  const focusLabel = focusIndex >= 0 ? SimRobotMapper.label(focusIndex) : '';
  // Rota avulsa (LH2_WAYPOINTS montado no mapa) só no modo Manual; em Semi-auto/Auto o robô segue tarefas.
  const canDraftForRobot = focus !== null && focus.robot.mode === RobotControlMode.Manual;
  const visibleDraft = routeDraft && routeDraft.address === focusAddress ? routeDraft : null;

  // ---- helpers ------------------------------------------------------------------------

  function clampPoint(p: Vec2Model): Vec2Model {
    return {
      x: Math.max(ROBOT_RADIUS_MM, Math.min(arena.width - ROBOT_RADIUS_MM, snap(p.x, POINT_SNAP_MM))),
      y: Math.max(ROBOT_RADIUS_MM, Math.min(arena.height - ROBOT_RADIUS_MM, snap(p.y, POINT_SNAP_MM))),
    };
  }

  function pickMockScenario() {
    selection.clearSelection();
    setTool('move');
    setRouteDraft(null);
    setPreviewTaskId(null);
    setNotice(null);
    vis.loadMockScenario();
    setPickerOpen(false);
  }

  function handleCreate(rect: CellSelectRect) {
    if (tool !== 'waypoint' || !canDraftForRobot || !focusAddress) return;
    const p = clampPoint({ x: rect.startPointX * CELL_MM, y: arena.height - rect.startPointY * CELL_MM });
    setNotice(
      collidesAny(p, ROBOT_RADIUS_MM, obstacles)
        ? { kind: 'error', text: 'Esse ponto fica dentro de uma barreira — o robô vai parar encostado nela.' }
        : null,
    );
    setRouteDraft((prev) =>
      prev && prev.address === focusAddress ? { ...prev, points: [...prev.points, p] } : { address: focusAddress, points: [p] },
    );
  }

  function renderCreatePreview(rect: ElementBounds) {
    return <Waypoint x={rect.x + rect.width / 2} y={rect.y + rect.height / 2} color="var(--color-orange)" className={mapStyles.preview} />;
  }

  function removeDraftPointAt(index: number) {
    // Remove pelo PONTO (não pelo índice): apagar vários selecionados chama isto uma vez por ponto.
    const target = routeDraft?.points[index];
    if (!target) return;
    setRouteDraft((prev) => {
      if (!prev) return prev;
      const points = [...prev.points];
      const k = points.findIndex((p) => p.x === target.x && p.y === target.y);
      if (k >= 0) points.splice(k, 1);
      return { ...prev, points };
    });
  }

  function stopDraft() {
    setRouteDraft(null);
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

  const waypointTitle = canDraftForRobot
    ? `Montar rota LH2_WAYPOINTS pra ${focusLabel} (clique no mapa; envie pelo drawer)`
    : focus
      ? 'Rota avulsa só no modo Manual — em Semi-auto/Auto o robô segue tarefas'
      : 'Selecione um robô em Manual pra montar uma rota';

  const tools = (
    <MapToolButton
      active={tool === 'waypoint'}
      onClick={() => setTool(tool === 'waypoint' ? 'move' : 'waypoint')}
      disabled={!canDraftForRobot}
      title={waypointTitle}
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
        points: taskPoints(previewTask) ?? [],
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
      onClearRoute={() => setRouteDraft(null)}
      onResendRoute={() =>
        focus?.route ? vis.sendWaypoints(focus.robot.address, focus.route.points, focus.route.threshold) : Promise.resolve(null)
      }
    />
  );

  // ---- render ------------------------------------------------------------------------------

  const count = (status: RobotStatus) => vis.robots.filter((v) => v.robot.status === status).length;

  const header = (
    <VisualizerControls
      scenarioName={cenario?.name ?? ''}
      size={cenario ? { cols: cenario.sizeX, rows: cenario.sizeY } : null}
      obstacleCount={obstacles.length}
      onChangeScenario={() => setPickerOpen(true)}
      link={vis.link}
      robotCount={vis.robots.length}
      counts={{ active: count(RobotStatus.Active), inactive: count(RobotStatus.Inactive), lost: count(RobotStatus.Lost) }}
      notice={notice}
    />
  );

  const menu = (
    <MenuColumns className={styles.menuColumn}>
      <Menu title={`Robôs (${rows.length})`}>
        <VisRobotList robots={rows} connected={connected} />
      </Menu>

      <Menu title={`Tarefas (${vis.tasks.length})`}>
        <VisTaskPanel
          tasks={vis.tasks}
          connected={connected}
          robotOfTask={robotOfTask}
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
      <SelectVisualizerScenarioModal
        open={pickerOpen || !cenario}
        closable={!!cenario}
        onClose={() => setPickerOpen(false)}
        onPickMock={pickMockScenario}
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
              renderCreatePreview={renderCreatePreview}
              tools={tools}
              panel={panel}
              onMoveDraftPoint={(index, pos) =>
                setRouteDraft((prev) =>
                  prev ? { ...prev, points: prev.points.map((p, i) => (i === index ? clampPoint(pos) : p)) } : prev,
                )
              }
              onRemoveDraftPoint={removeDraftPointAt}
            />
          ) : (
            <div className={styles.placeholder} style={{ height: maxMapHeight }} />
          )
        }
      </MapMenuLayout>
    </MapElementsProvider>
  );
}

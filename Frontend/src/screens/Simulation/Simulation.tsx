import { useRef, useState } from 'react';
import { GatewayLog } from '../../components/GatewayLog/GatewayLog';
import type { CellSelectRect } from '../../components/MapCanvas/MapCanvas';
import { MapMenuLayout } from '../../components/MapMenuLayout/MapMenuLayout';
import { MapToolButton } from '../../components/MapToolButton/MapToolButton';
import { ObstacleIcon, PauseIcon, PlayIcon, RobotIcon, StopIcon, WaypointIcon } from '../../components/MapToolButton/icons';
import type { BaseTool } from '../../components/MapViewport/MapViewport';
import { Menu } from '../../components/Menu/Menu';
import { NetworkPanel } from '../../components/NetworkPanel/NetworkPanel';
import { Obstacle } from '../../components/Obstacle/Obstacle';
import { Robot } from '../../components/Robot/RobotProp';
import { SelectSimulationScenarioModal } from '../../components/SelectSimulationScenarioModal/SelectSimulationScenarioModal';
import { SimObstacleDrawer } from '../../components/SimObstacleDrawer/SimObstacleDrawer';
import { SimRobotDrawer } from '../../components/SimRobotDrawer/SimRobotDrawer';
import { SimRobotEditDrawer } from '../../components/SimRobotEditDrawer/SimRobotEditDrawer';
import { SimRobotList } from '../../components/SimRobotList/SimRobotList';
import { SimTaskPanel } from '../../components/SimTaskPanel/SimTaskPanel';
import { SimulationControls } from '../../components/SimulationControls/SimulationControls';
import type { Notice } from '../../components/SimulationControls/SimulationControls';
import { SwarmitPanel } from '../../components/SwarmitPanel/SwarmitPanel';
import { Waypoint } from '../../components/Waypoint/Waypoint';
import {
  ADDRESS_RE,
  CELL_MM,
  DEFAULT_WAYPOINT_THRESHOLD_MM,
  OBSTACLE_SNAP_MM,
  POINT_SNAP_MM,
  ROBOT_RADIUS_MM,
} from '../../Consts/SimulationConsts';
import { RobotControlMode } from '../../enums/RobotControlMode.enum';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { TaskStatus } from '../../enums/TaskStatus.enum';
import { MapElementsProvider, useMapElementsState } from '../../hooks/useMapElements';
import type { ElementBounds } from '../../hooks/useSelectableElements';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import type { ScenarioModel } from '../../model/Scenario.Model';
import type { SimMapRobotModel, SimRobotRowModel } from '../../model/SimRobot.Model';
import type { SimObstacleModel, Vec2Model } from '../../model/SimWorld.Model';
import { SimulationService } from '../../services/Simulation.Service';
import { collidesAny } from './SimPhysics';
import { SimulationMap } from './SimulationMap';
import { cellRectToWorld, snap } from './useMapGeometry';
import {
  addObstacle,
  addRobot,
  addRobotWaypoint,
  makeObstacle,
  makeRobot,
  moveRobotWaypoint,
  patchObstacle,
  patchRobot,
  removeObstacle,
  removeRobot,
  setRobotStart,
} from './useScenarioEditor';
import { useSimulation } from './useSimulation';
import type { SimMode } from './useSimulation';
import { hasDraftSelection, obstacleSelId, obstaclesFromSelection, robotFromSelection, robotSelId } from './useSimSelection';
import mapStyles from './SimulationMap.module.css';
import styles from './Simulation.module.css';

const PRESETS = SimulationService.listPresets();

type Tool = BaseTool | 'obstacle' | 'robot' | 'waypoint';
const CREATE_TOOLS: Tool[] = ['obstacle', 'robot', 'waypoint'];

// Tela de Simulação — recriada no padrão das outras telas (MapMenuLayout +
// header no topo + MapCanvas + Menu + ferramentas no canto do mapa + Drawer da seleção +
// modal de escolha no início, como CenarioBuilder/TaskBuilder) seguindo a
// lógica e o modelo de funcionamento do RobotSwarmSimulator:
//   - Editar: monta o estado inicial do cenário (barreiras, robôs, rotas,
//     rede e parâmetros), no mesmo JSON do simulador;
//   - Simular: roda o cenário do zero — cinemática diferencial, AUTO com
//     waypoints/loop, colisão com barreiras/bordas/entre robôs, bateria,
//     ciclo de vida da rede Mari (JOINED/LEFT/KEEP_ALIVE/GATEWAY_INFO),
//     PDR/latência e swarmit — com o gateway simulado falando com um backend
//     LOCAL (LocalFleetLink), já que a conexão com a API ainda não existe.
export function Simulation() {
  const sim = useSimulation();
  const mapElements = useMapElementsState();
  const selection = mapElements.contextValue;
  const selectedIds = selection.selectedIds;

  const [tool, setTool] = useState<Tool>('move');
  const [pickerOpen, setPickerOpen] = useState(true);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [routeDraft, setRouteDraft] = useState<{ address: string; points: Vec2Model[] } | null>(null);
  /** Task cuja rota aparece no mapa (escolhida no cartão Tarefas ou no seletor do Semi-auto). */
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);

  const draft = sim.draft;
  const editing = sim.mode === 'edit';

  // ---- dados do mapa (draft no Editar, World no Simular) ---------------------

  const arena = sim.world
    ? { width: sim.world.arena.width, height: sim.world.arena.height }
    : draft
      ? { width: draft.arena.width_mm, height: draft.arena.height_mm }
      : { width: CELL_MM, height: CELL_MM };

  const obstacles: SimObstacleModel[] = sim.world
    ? sim.world.obstacles
    : (draft?.obstacles ?? []).map((o) => ({ id: o.id, x: o.x_mm, y: o.y_mm, w: o.w_mm, h: o.h_mm }));

  const mapRobots: SimMapRobotModel[] = editing
    ? (draft?.robots ?? []).map(SimRobotMapper.fromScenario)
    : sim.robots.map(SimRobotMapper.fromState);

  const rows: SimRobotRowModel[] = editing
    ? (draft?.robots ?? []).map(SimRobotMapper.rowFromScenario)
    : sim.robots.map((r, i) =>
        SimRobotMapper.rowFromState(r, i, {
          backendStatus: sim.backend.get(r.address)?.status ?? null,
          swarmitStatus: sim.swarmit.get(r.address)?.status ?? null,
          backendMode: sim.backend.get(r.address)?.record?.mode ?? null,
          taskName: sim.backend.get(r.address)?.task?.name ?? null,
        }),
      );

  // ---- robô em foco (drawer + ferramenta Waypoint) ------------------------------
  // Selecionar o robô (ou um ponto da rota dele) põe ele em foco. Com a
  // ferramenta Waypoint ligada o foco "gruda": clicar no mapa pra criar
  // ponto não pode perder o robô-alvo.
  const fromSelection =
    robotFromSelection(selectedIds) ?? (hasDraftSelection(selectedIds) ? (routeDraft?.address ?? null) : null);
  const stickyFocus = useRef<string | null>(null);
  if (fromSelection) stickyFocus.current = fromSelection;
  else if (tool !== 'waypoint') stickyFocus.current = null;
  const focusIndex = mapRobots.findIndex((r) => r.address === stickyFocus.current);
  const focusAddress = focusIndex >= 0 ? mapRobots[focusIndex].address : null;
  const selectedObstacleIds = obstaclesFromSelection(selectedIds);
  const visibleDraft = routeDraft && routeDraft.address === focusAddress ? routeDraft : null;
  // Simular: a rota avulsa (LH2_WAYPOINTS montado no mapa) é só do modo
  // Manual; em Semi-auto/Auto o robô segue tasks puxadas do backend.
  const focusBackend = !editing && focusAddress ? (sim.backend.get(focusAddress) ?? null) : null;
  const focusMode = focusBackend?.record?.mode ?? RobotControlMode.Manual;
  const canDraftForRobot = focusAddress !== null && focusMode === RobotControlMode.Manual;

  // ---- helpers ---------------------------------------------------------------------

  function resetInteraction() {
    selection.clearSelection();
    setTool('move');
    setRouteDraft(null);
    setPreviewTaskId(null);
  }

  function loadScenario(scenario: ScenarioModel, name: string, target: SimMode) {
    resetInteraction();
    setNotice(null);
    setPickerError(null);
    try {
      sim.load(scenario, name, target);
      setPickerOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPickerError(msg);
      setNotice({ kind: 'error', text: msg });
    }
  }

  function importText(text: string, name: string, fromPicker: boolean) {
    const parsed = SimulationService.parseFile(text);
    if (!parsed.ok) {
      if (fromPicker) setPickerError(parsed.error);
      else setNotice({ kind: 'error', text: parsed.error });
      return;
    }
    loadScenario(parsed.scenario, name, 'edit');
    setNotice({ kind: 'info', text: `Cenário "${name}" importado — confira no modo Editar e depois Simular.` });
  }

  function handleModeChange(next: SimMode) {
    if (next === sim.mode) return;
    resetInteraction();
    setNotice(null);
    try {
      if (next === 'sim') sim.enterSim();
      else sim.enterEdit();
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    }
  }

  function clampPoint(p: Vec2Model): Vec2Model {
    return {
      x: Math.max(ROBOT_RADIUS_MM, Math.min(arena.width - ROBOT_RADIUS_MM, snap(p.x, POINT_SNAP_MM))),
      y: Math.max(ROBOT_RADIUS_MM, Math.min(arena.height - ROBOT_RADIUS_MM, snap(p.y, POINT_SNAP_MM))),
    };
  }

  function pointFromCell(rect: CellSelectRect): Vec2Model {
    return clampPoint({ x: rect.startPointX * CELL_MM, y: arena.height - rect.startPointY * CELL_MM });
  }

  function robotFits(p: Vec2Model): boolean {
    return !collidesAny(p, ROBOT_RADIUS_MM, obstacles);
  }

  // ---- criação pelas ferramentas do mapa ------------------------------------------

  function handleCreate(rect: CellSelectRect) {
    if (tool === 'obstacle' && draft) {
      const raw = cellRectToWorld(rect, arena.height);
      const x = Math.max(0, snap(raw.x, OBSTACLE_SNAP_MM));
      const y = Math.max(0, snap(raw.y, OBSTACLE_SNAP_MM));
      const w = Math.min(arena.width - x, snap(raw.x + raw.w, OBSTACLE_SNAP_MM) - x);
      const h = Math.min(arena.height - y, snap(raw.y + raw.h, OBSTACLE_SNAP_MM) - y);
      if (w <= 0 || h <= 0) return; // clique sem arrasto
      sim.updateDraft((s) => addObstacle(s, makeObstacle(s, { x, y, w, h })));
      return;
    }

    if (tool === 'robot' && draft) {
      const p = pointFromCell(rect);
      if (!robotFits(p)) {
        setNotice({ kind: 'error', text: 'O robô não cabe aí — tem barreira. Escolha um ponto livre.' });
        return;
      }
      const robot = makeRobot(draft, p);
      sim.updateDraft((s) => addRobot(s, robot));
      selection.selectOnly(robotSelId(robot.address));
      setNotice(null);
      return;
    }

    const owner = editing || canDraftForRobot ? focusAddress : null;
    if (tool === 'waypoint' && owner) {
      const p = pointFromCell(rect);
      setNotice(
        robotFits(p)
          ? null
          : { kind: 'error', text: 'Esse ponto fica dentro de uma barreira — o robô vai parar encostado nela.' },
      );
      if (editing) {
        sim.updateDraft((s) => addRobotWaypoint(s, owner, p));
      } else {
        setRouteDraft((prev) =>
          prev && prev.address === owner ? { ...prev, points: [...prev.points, p] } : { address: owner, points: [p] },
        );
      }
    }
  }

  function renderCreatePreview(rect: ElementBounds) {
    if (tool === 'obstacle') {
      return <Obstacle x={rect.x} y={rect.y} width={rect.width} height={rect.height} className={mapStyles.preview} />;
    }
    const center = { left: rect.x + rect.width / 2, top: rect.y + rect.height / 2 };
    if (tool === 'robot') {
      return <Robot label="+" status={RobotStatus.Active} className={mapStyles.preview} style={{ position: 'absolute', ...center }} />;
    }
    return <Waypoint x={center.left} y={center.top} color="var(--color-orange)" className={mapStyles.preview} />;
  }

  // ---- edição de elementos (modo Editar) -------------------------------------------

  function renameRobot(address: string, next: string): string | null {
    if (!draft) return null;
    const upper = next.trim().toUpperCase();
    if (!ADDRESS_RE.test(upper)) return 'O endereço precisa ter 16 dígitos hex (0-9, A-F).';
    if (draft.robots.some((r) => r.address === upper && r.address !== address)) return 'Já existe um robô com esse endereço.';
    sim.updateDraft((s) => patchRobot(s, address, { address: upper }));
    selection.selectOnly(robotSelId(upper));
    return null;
  }

  function renameObstacle(id: string, next: string): string | null {
    if (!draft) return null;
    if (!next) return 'O nome não pode ficar vazio.';
    if (draft.obstacles.some((o) => o.id === next && o.id !== id)) return 'Já existe uma barreira com esse nome.';
    sim.updateDraft((s) => patchObstacle(s, id, { id: next }));
    selection.selectOnly(obstacleSelId(next));
    return null;
  }

  function removeWaypointAt(address: string, index: number) {
    // Remove pelo PONTO (não pelo índice): apagar vários selecionados de uma
    // vez chama isto uma vez por ponto, e o índice mudaria a cada remoção.
    const target = draft?.robots.find((r) => r.address === address)?.waypoints?.[index];
    if (!target) return;
    sim.updateDraft((s) =>
      patchRobot(s, address, {
        waypoints: (() => {
          const list = [...(s.robots.find((r) => r.address === address)?.waypoints ?? [])];
          const k = list.findIndex((w) => w.x_mm === target.x_mm && w.y_mm === target.y_mm);
          if (k >= 0) list.splice(k, 1);
          return list;
        })(),
      }),
    );
  }

  function removeDraftPointAt(index: number) {
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

  function closeDrawer() {
    selection.clearSelection();
    if (tool === 'waypoint') setTool('move');
  }

  // ---- ferramentas no canto do mapa -------------------------------------------------

  const toggleTool = (t: Tool) => setTool(tool === t ? 'move' : t);
  const waypointTitle = editing
    ? focusAddress
      ? `Adicionar waypoint à rota de ${SimRobotMapper.label(focusIndex)} (clique no mapa)`
      : 'Selecione um robô pra adicionar waypoints'
    : canDraftForRobot
      ? `Montar rota LH2_WAYPOINTS pra ${SimRobotMapper.label(focusIndex)} (clique no mapa; envie pelo drawer)`
      : focusAddress
        ? 'Rota avulsa só no modo Manual — em Semi-auto/Auto o robô segue tarefas'
        : 'Selecione um robô em Manual pra montar uma rota';

  function stopDraft() {
    setRouteDraft(null);
    setTool('move');
  }

  function robotLabelOf(address: string): string {
    const i = mapRobots.findIndex((r) => r.address === address);
    return i >= 0 ? SimRobotMapper.label(i) : SimRobotMapper.shortAddress(address);
  }

  const tools = editing ? (
    <>
      <MapToolButton active={tool === 'obstacle'} onClick={() => toggleTool('obstacle')} title="Desenhar barreira (arraste no mapa)">
        <ObstacleIcon />
      </MapToolButton>
      <MapToolButton active={tool === 'robot'} onClick={() => toggleTool('robot')} title="Adicionar robô (clique no mapa)">
        <RobotIcon />
      </MapToolButton>
      <MapToolButton active={tool === 'waypoint'} onClick={() => toggleTool('waypoint')} disabled={!focusAddress} title={waypointTitle}>
        <WaypointIcon />
      </MapToolButton>
    </>
  ) : (
    <>
      <MapToolButton variant="click" onClick={sim.playing ? sim.pause : sim.play} title={sim.playing ? 'Pausar' : 'Retomar'}>
        {sim.playing ? <PauseIcon /> : <PlayIcon />}
      </MapToolButton>
      <MapToolButton variant="click" onClick={sim.reset} title="Reiniciar o cenário do zero">
        <StopIcon />
      </MapToolButton>
      <MapToolButton
        active={tool === 'waypoint'}
        onClick={() => toggleTool('waypoint')}
        disabled={!canDraftForRobot}
        title={waypointTitle}
      >
        <WaypointIcon />
      </MapToolButton>
    </>
  );

  // ---- drawers da seleção ------------------------------------------------------------


  const focusDraftRobot = editing && focusAddress ? (draft?.robots.find((r) => r.address === focusAddress) ?? null) : null;
  const focusSimRobot = !editing && focusAddress ? (sim.robots.find((r) => r.address === focusAddress) ?? null) : null;
  const showRobotDrawer = selectedObstacleIds.length === 0;

  // Rota da task em destaque no mapa (rosa). Vinda do seletor do Semi-auto,
  // sai da posição atual do robô em foco — é o caminho que ele vai fazer.
  const previewTask = !editing && previewTaskId ? (sim.orchestrator?.tasks.find((t) => t.uuid === previewTaskId) ?? null) : null;
  const taskPreview = previewTask
    ? {
        from:
          focusSimRobot && focusMode === RobotControlMode.SemiAuto && !focusBackend?.task
            ? { x: focusSimRobot.pos_x, y: focusSimRobot.pos_y }
            : null,
        points: [...previewTask.waypoints].sort((a, b) => a.orderIndex - b.orderIndex).map((w) => ({ x: w.x, y: w.y })),
      }
    : null;

  const panel = editing ? (
    <>
      <SimRobotEditDrawer
        robot={showRobotDrawer ? focusDraftRobot : null}
        label={focusIndex >= 0 ? SimRobotMapper.label(focusIndex) : ''}
        onClose={closeDrawer}
        onRename={(next) => (focusAddress ? renameRobot(focusAddress, next) : null)}
        onPatch={(patch) => focusAddress && sim.updateDraft((s) => patchRobot(s, focusAddress, patch))}
        onStart={(patch) => focusAddress && sim.updateDraft((s) => setRobotStart(s, focusAddress, patch))}
        onRemoveWaypoint={(i) => focusAddress && removeWaypointAt(focusAddress, i)}
        onRemove={() => {
          if (!focusAddress) return;
          sim.updateDraft((s) => removeRobot(s, focusAddress));
          closeDrawer();
        }}
      />
      <SimObstacleDrawer
        obstacles={draft?.obstacles ?? []}
        onPatch={(id, patch) => sim.updateDraft((s) => patchObstacle(s, id, patch))}
        onRename={renameObstacle}
      />
    </>
  ) : (
    <SimRobotDrawer
      robot={focusSimRobot}
      label={focusIndex >= 0 ? SimRobotMapper.label(focusIndex) : ''}
      onClose={closeDrawer}
      backend={focusBackend}
      now={sim.time}
      swarmitOn={sim.swarmitEnabled}
      device={focusAddress ? (sim.swarmit.get(focusAddress) ?? null) : null}
      routeDraft={visibleDraft?.points ?? []}
      pendingTasks={(sim.orchestrator?.tasks ?? []).filter((t) => t.status === TaskStatus.Pending)}
      nextRunIn={sim.orchestrator?.nextRunIn ?? 0}
      onSetOnline={(online) => focusAddress && sim.setRobotOnline(focusAddress, online)}
      onMoveRaw={(l, r) => focusAddress && sim.moveRaw(focusAddress, l, r)}
      onMode={(m) => {
        if (!focusAddress) return null;
        if (m !== RobotControlMode.Manual) stopDraft(); // rota avulsa só existe no Manual
        return sim.setRobotMode(focusAddress, m);
      }}
      onRgb={(c) => focusAddress && sim.setRgb(focusAddress, c.r, c.g, c.b)}
      onAssign={(taskId) => (focusAddress ? sim.assignTask(focusAddress, taskId) : null)}
      onPreviewTask={setPreviewTaskId}
      onThreshold={(mm) => focusAddress && sim.setWaypointThreshold(focusAddress, mm)}
      onSendRoute={(threshold) => {
        if (!focusAddress || !visibleDraft) return;
        sim.sendWaypoints(focusAddress, visibleDraft.points, threshold);
        stopDraft();
      }}
      onClearRoute={() => setRouteDraft(null)}
      onResendRoute={() =>
        focusSimRobot &&
        sim.sendWaypoints(focusSimRobot.address, focusSimRobot.waypoints, focusSimRobot.waypoint_threshold || DEFAULT_WAYPOINT_THRESHOLD_MM)
      }
      onSwarmit={(action) => focusAddress && sim.swarmitCommand(focusAddress, action)}
      onFlash={() => focusAddress && sim.swarmitFlash(focusAddress)}
    />
  );

  // ---- render ----------------------------------------------------------------------------

  const onlineCount = sim.robots.filter((r) => r.online).length;

  const header = (
    <SimulationControls
      scenarioName={sim.scenarioName}
      onRename={sim.setScenarioName}
      mode={sim.mode}
      onModeChange={handleModeChange}
      playing={sim.playing}
      onTogglePlay={sim.playing ? sim.pause : sim.play}
      onReset={sim.reset}
      time={sim.time}
      tickHz={sim.tickHz}
      arena={arena}
      onlineCount={onlineCount}
      robotCount={mapRobots.length}
      obstacleCount={obstacles.length}
      onChangeScenario={() => {
        setPickerError(null);
        setPickerOpen(true);
      }}
      onImport={(text, name) => importText(text, name, false)}
      onExportScenario={sim.exportDraft}
      onExportState={sim.exportState}
      notice={notice}
    />
  );

  const menu = (
    <div className={styles.menuColumn}>
      <Menu title={`Robôs (${mapRobots.length})`}>
        <SimRobotList robots={rows} editing={editing} />
      </Menu>

      {!editing && sim.orchestrator && (
        <Menu title={`Tarefas (${sim.orchestrator.tasks.length})`}>
          <SimTaskPanel
            tasks={sim.orchestrator.tasks}
            robotLabel={robotLabelOf}
            nextRunIn={sim.orchestrator.nextRunIn}
            freeAuto={sim.orchestrator.freeAuto}
            selectedId={previewTaskId}
            onSelect={setPreviewTaskId}
          />
        </Menu>
      )}

      {sim.netConfig && (
        <Menu title="Rede">
          <NetworkPanel
            mode={sim.mode}
            value={sim.netConfig}
            onChange={sim.setNetConfig}
            sim={draft?.sim ?? null}
            onSimChange={sim.setSimParams}
            stats={sim.netStats}
            received={sim.received}
          />
        </Menu>
      )}

      {!editing && (
        <Menu title="Swarmit">
          <SwarmitPanel
            enabled={sim.swarmitEnabled}
            onToggle={sim.setSwarmitEnabled}
            onStartAll={sim.swarmitStartAll}
            robots={sim.robots.map((r, i) => ({
              address: r.address,
              label: SimRobotMapper.label(i),
              device: sim.swarmit.get(r.address) ?? null,
              otaProgress: sim.backend.get(r.address)?.view?.otaProgress ?? null,
            }))}
          />
        </Menu>
      )}

      {!editing && (
        <Menu title="Log do gateway">
          <GatewayLog entries={sim.logEntries} />
        </Menu>
      )}
    </div>
  );

  return (
    <MapElementsProvider value={selection}>
      <SelectSimulationScenarioModal
        open={pickerOpen || !draft}
        closable={!!draft}
        onClose={() => setPickerOpen(false)}
        presets={PRESETS}
        onPickPreset={(key) => {
          const scenario = SimulationService.createPreset(key);
          const preset = PRESETS.find((p) => p.key === key);
          if (scenario && preset) loadScenario(scenario, preset.name, 'sim');
        }}
        onBlank={() => loadScenario(SimulationService.createBlank(), 'novo cenário', 'edit')}
        onImportFile={(text, name) => importText(text, name, true)}
        error={pickerError}
      />

      <MapMenuLayout header={header} menu={menu}>
        {(maxMapHeight) =>
          draft ? (
            <SimulationMap
              arena={arena}
              obstacles={obstacles}
              robots={mapRobots}
              trails={editing ? undefined : sim.trails}
              editable={editing}
              focusAddress={focusAddress}
              routeDraft={visibleDraft}
              taskPreview={taskPreview}
              maxHeight={maxMapHeight}
              elements={mapElements}
              className={CREATE_TOOLS.includes(tool) ? mapStyles.editableGrid : undefined}
              tool={tool}
              onToolChange={setTool}
              createTool={CREATE_TOOLS.includes(tool) ? tool : undefined}
              onCreate={handleCreate}
              renderCreatePreview={renderCreatePreview}
              tools={tools}
              panel={panel}
              onMoveObstacle={(id, pos) =>
                sim.updateDraft((s) => {
                  const o = s.obstacles.find((x) => x.id === id);
                  if (!o) return s;
                  return patchObstacle(s, id, {
                    x_mm: Math.max(0, Math.min(arena.width - o.w_mm, snap(pos.x, OBSTACLE_SNAP_MM))),
                    y_mm: Math.max(0, Math.min(arena.height - o.h_mm, snap(pos.y, OBSTACLE_SNAP_MM))),
                  });
                })
              }
              onRemoveObstacle={(id) => sim.updateDraft((s) => removeObstacle(s, id))}
              onMoveRobot={(address, pos) => {
                const p = clampPoint(pos);
                if (!robotFits(p)) {
                  setNotice({ kind: 'error', text: 'O robô não cabe aí — tem barreira.' });
                  return;
                }
                sim.updateDraft((s) => setRobotStart(s, address, { x_mm: p.x, y_mm: p.y }));
              }}
              onRemoveRobot={(address) => sim.updateDraft((s) => removeRobot(s, address))}
              onMoveWaypoint={(address, index, pos) => sim.updateDraft((s) => moveRobotWaypoint(s, address, index, clampPoint(pos)))}
              onRemoveWaypoint={removeWaypointAt}
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

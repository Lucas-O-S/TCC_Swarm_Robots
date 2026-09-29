import { useState } from 'react';
import { Button } from '../Button/Button';
import { Drawer } from '../Drawer/Drawer';
import { DrawerActions, DrawerBody, DrawerDivider, DrawerError, DrawerHint, DrawerSection } from '../Drawer/DrawerForm';
import { KeyValueList } from '../KeyValueList/KeyValueList';
import { LedControl } from '../LedControl/LedControl';
import { ManualDrive } from '../ManualDrive/ManualDrive';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { RobotModeField } from '../RobotModeField/RobotModeField';
import { RobotTaskSection } from '../RobotTaskSection/RobotTaskSection';
import { RouteDraftSection } from '../RouteDraftSection/RouteDraftSection';
import { StatusLine, StatusSep } from '../StatusLine/StatusLine';
import { DEFAULT_WAYPOINT_THRESHOLD_MM, RAD_TO_DEG } from '../../Consts/SimulationConsts';
import { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import { RobotControlMode } from '../../enums/RobotControlMode.enum';
import { SwarmitDeviceStatus } from '../../enums/SwarmitDeviceStatus.enum';
import { swarmitStatusName } from '../../Integration/Protocols/Swarmit/Swarmit.Protocol';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import type { RgbColorModel, SimRobotModel } from '../../model/SimRobot.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';
import type { TaskModel } from '../../model/Task.Model';
import type { SwarmitDeviceView } from '../../screens/Simulation/SimGateway';
import type { BackendRobotInfo } from '../../screens/Simulation/useSimulation';

// ---------------------------------------------------------------------------
// Modo Simular — telemetria + comandos. A tela faz o papel do backend: cada
// botão vira um comando que DESCE pelo gateway simulado (e pelo modelo de
// rede — com PDR < 100% pode se perder), exatamente como viria da API.
// As seções de comando (modo, direção manual, rota avulsa, tarefa, LED) são
// as mesmas do drawer do Visualizador: RobotModeField, ManualDrive,
// RouteDraftSection, RobotTaskSection e LedControl.
// ---------------------------------------------------------------------------

interface SimRobotDrawerProps {
  robot: SimRobotModel | null;
  label: string;
  onClose: () => void;
  backend: BackendRobotInfo | null;
  now: number;
  swarmitOn: boolean;
  device: SwarmitDeviceView | null;
  /** Pontos montados no mapa (ferramenta Waypoint) pra rota avulsa do modo Manual. */
  routeDraft: Vec2Model[];
  /** Tasks pendentes da fila (pra atribuir no Semi-auto). */
  pendingTasks: readonly TaskModel[];
  /** Segundos até a próxima rodada do orquestrador. */
  nextRunIn: number;
  onSetOnline: (online: boolean) => void;
  onMoveRaw: (left: number, right: number) => void;
  onMode: (mode: RobotControlMode) => string | null;
  onRgb: (rgb: RgbColorModel) => void;
  onAssign: (taskId: string) => string | null;
  /** Semi-auto: larga a task em andamento (o robô para, ela volta pra fila). */
  onReleaseTask: () => string | null;
  /** Semi-auto: troca a task em andamento por outra pendente. */
  onSwitchTask: (taskId: string) => string | null;
  /** Task escolhida no seletor do Semi-auto — o mapa mostra a rota dela antes de atribuir. */
  onPreviewTask: (taskId: string | null) => void;
  onThreshold: (mm: number) => void;
  onSendRoute: (threshold: number) => void;
  onClearRoute: () => void;
  onResendRoute: () => void;
  onSwarmit: (action: 'start' | 'stop' | 'reset') => void;
  onFlash: () => void;
}

export function SimRobotDrawer(props: SimRobotDrawerProps) {
  return (
    <Drawer open={props.robot !== null} onClose={props.onClose} title={props.robot ? `Robô ${props.label}` : 'Robô'}>
      {props.robot && <SimRobotPanel {...props} robot={props.robot} />}
    </Drawer>
  );
}

function SimRobotPanel({
  robot,
  backend,
  now,
  swarmitOn,
  device,
  routeDraft,
  pendingTasks,
  nextRunIn,
  onSetOnline,
  onMoveRaw,
  onMode,
  onRgb,
  onAssign,
  onReleaseTask,
  onSwitchTask,
  onPreviewTask,
  onThreshold,
  onSendRoute,
  onClearRoute,
  onResendRoute,
  onSwarmit,
  onFlash,
}: SimRobotDrawerProps & { robot: SimRobotModel }) {
  const [speed, setSpeed] = useState(80);
  const [routeThreshold, setRouteThreshold] = useState(DEFAULT_WAYPOINT_THRESHOLD_MM);
  const [error, setError] = useState<string | null>(null);

  const wireAuto = robot.mode === DotBotControlMode.Auto;
  const lastAdv = backend?.view?.lastAdvertisementAt ?? null;
  const record = backend?.record ?? null;
  const mode = record?.mode ?? null;
  const canCommand = robot.online && robot.appRunning;

  return (
    <DrawerBody>
      <StatusLine tone={robot.online ? 'on' : 'off'}>
        {robot.online ? 'na rede' : 'fora da rede'}
        <StatusSep />
        API: {backend?.status !== null && backend?.status !== undefined ? SimRobotMapper.statusLabel(backend.status) : 'não cadastrado'}
        {lastAdv !== null && ` (há ${(now - lastAdv).toFixed(1)} s)`}
      </StatusLine>
      <DrawerHint mono>{robot.address}</DrawerHint>

      <KeyValueList
        items={[
          { label: 'pos (mm)', value: `x=${robot.pos_x.toFixed(0)} y=${robot.pos_y.toFixed(0)}` },
          { label: 'theta', value: `${(robot.theta * RAD_TO_DEG).toFixed(1)}°` },
          { label: 'modo (fio)', value: wireAuto ? (robot.loop ? 'AUTO (loop)' : 'AUTO') : 'MANUAL' },
          { label: 'bateria', value: `${robot.battery.toFixed(1)}%` },
          { label: 'pwm L/R', value: `${robot.pwm_left} / ${robot.pwm_right}` },
          { label: 'encoders', value: `${robot.encoder_left.toFixed(0)} / ${robot.encoder_right.toFixed(0)}` },
          {
            label: 'wp_idx',
            value:
              robot.waypoints.length > 0
                ? `${robot.waypoint_idx}/${robot.waypoints.length}${robot.loop ? ' (loop)' : robot.waypoint_idx >= robot.waypoints.length ? ' (fim)' : ''}`
                : '—',
          },
          { label: 'app', value: robot.appRunning ? 'rodando' : 'parado (bootloader)' },
        ]}
      />

      <Button
        variant={robot.online ? 'outline' : 'accent'}
        onClick={() => onSetOnline(!robot.online)}
        disabled={!robot.online && robot.battery <= 0}
        title={
          robot.online
            ? 'Injeta falha: o robô sai da rede (o gateway emite NODE_LEFT)'
            : robot.battery <= 0
              ? 'Sem bateria — religar não ressuscita bateria zerada'
              : 'Religa o robô (o gateway re-emite NODE_JOINED)'
        }
      >
        {robot.online ? 'Derrubar (falha)' : 'Religar'}
      </Button>

      <DrawerSection title="Comandos (backend)" />
      {!canCommand && (
        <DrawerHint>
          {robot.online ? 'App parado no bootloader — mande START na seção Swarmit.' : 'Fora da rede — comandos não chegam.'}
        </DrawerHint>
      )}

      <RobotModeField
        value={mode}
        onChange={(next) => setError(onMode(next))}
        pendingText="O backend ainda não cadastrou este robô — espera o primeiro DOTBOT_ADVERTISEMENT."
      />
      {error && <DrawerError>{error}</DrawerError>}

      {mode === RobotControlMode.Manual && (
        <>
          <ManualDrive theta={robot.theta} speed={speed} onSpeedChange={setSpeed} onDrive={onMoveRaw} />
          <RouteDraftSection
            draftCount={routeDraft.length}
            threshold={routeThreshold}
            onThresholdChange={setRouteThreshold}
            onSend={() => onSendRoute(routeThreshold)}
            onClear={onClearRoute}
            onResend={onResendRoute}
            canResend={robot.waypoints.length > 0}
          />
        </>
      )}

      {(mode === RobotControlMode.SemiAuto || mode === RobotControlMode.Auto) && record && (
        <RobotTaskSection
          key={`${robot.address}-${mode}`}
          semiAuto={mode === RobotControlMode.SemiAuto}
          task={backend?.task ?? null}
          hasTask={Boolean(backend?.task)}
          wpIdx={robot.waypoint_idx}
          threshold={record.waypointsThreshold}
          pendingTasks={pendingTasks}
          nextRunIn={nextRunIn}
          onAssign={(id) => setError(onAssign(id))}
          onRelease={() => setError(onReleaseTask())}
          onSwitch={(id) => setError(onSwitchTask(id))}
          onPreview={onPreviewTask}
          onThreshold={onThreshold}
        />
      )}

      <DrawerDivider />
      <LedControl value={robot.rgb} onApply={onRgb} />

      {swarmitOn && (
        <>
          <DrawerSection title="Swarmit" />
          <StatusLine>
            estado: {device ? swarmitStatusName(device.status) : '—'}
            {device?.status === SwarmitDeviceStatus.Programming && ` · flash ${Math.round(device.flashProgress * 100)}%`}
          </StatusLine>
          {backend?.view?.otaProgress !== null && backend?.view?.otaProgress !== undefined && (
            <ProgressBar value={backend.view.otaProgress} title="Chunks com ACK vistos pelo backend" />
          )}
          <DrawerActions>
            <Button variant="outline" onClick={onFlash} title="OTA_START + 8 chunks de 128 B">
              Flash
            </Button>
            <Button variant="accent" onClick={() => onSwarmit('start')}>
              Start
            </Button>
            <Button variant="outline" onClick={() => onSwarmit('stop')}>
              Stop
            </Button>
            <Button variant="outline" onClick={() => onSwarmit('reset')} title="RESET na pose atual → Bootloader">
              Reset
            </Button>
          </DrawerActions>
        </>
      )}
    </DrawerBody>
  );
}

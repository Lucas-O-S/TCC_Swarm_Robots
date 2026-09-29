import { useState } from 'react';
import { Drawer } from '../Drawer/Drawer';
import { DrawerBody, DrawerDivider, DrawerError, DrawerHint, DrawerSection } from '../Drawer/DrawerForm';
import { KeyValueList } from '../KeyValueList/KeyValueList';
import { LedControl } from '../LedControl/LedControl';
import { ManualDrive } from '../ManualDrive/ManualDrive';
import { RobotModeField } from '../RobotModeField/RobotModeField';
import { RobotTaskSection } from '../RobotTaskSection/RobotTaskSection';
import { RouteDraftSection } from '../RouteDraftSection/RouteDraftSection';
import { StatusLine, StatusSep } from '../StatusLine/StatusLine';
import type { StatusTone } from '../StatusLine/StatusLine';
import { DEFAULT_WAYPOINT_THRESHOLD_MM, RAD_TO_DEG } from '../../Consts/SimulationConsts';
import { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import { RobotControlMode } from '../../enums/RobotControlMode.enum';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import { VisRobotMapper } from '../../mapper/VisRobot.Mapper';
import type { RgbColorModel } from '../../model/SimRobot.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';
import type { TaskModel } from '../../model/Task.Model';
import type { VisRobotModel } from '../../model/VisRobot.Model';

const STATUS_TONE: Record<RobotStatus, StatusTone> = {
  [RobotStatus.Active]: 'on',
  [RobotStatus.Inactive]: 'warn',
  [RobotStatus.Lost]: 'off',
};

/** Toda ação do drawer vira uma chamada da API: resolve com a mensagem de erro, ou null. */
type ApiResult = Promise<string | null>;

// ---------------------------------------------------------------------------
// Drawer do robô no Visualizador: a telemetria que a API manda + as mesmas
// seções de comando do drawer da Simulação (RobotModeField, ManualDrive,
// RouteDraftSection, RobotTaskSection, LedControl), sem o que é do mundo
// simulado (derrubar/religar, swarmit). Cada ação vira uma rota da API (ver
// Integration/ApiLink.ts) e o erro dela aparece aqui.
// ---------------------------------------------------------------------------

interface VisRobotDrawerProps {
  robot: VisRobotModel | null;
  label: string;
  onClose: () => void;
  /** Relógio da tela (ms), pro "telemetria há X s". */
  now: number;
  connected: boolean;
  /** Tarefa atual do robô (robot.taskId), se a lista da API tiver. */
  task: TaskModel | null;
  pendingTasks: readonly TaskModel[];
  /** Pontos montados no mapa (ferramenta Waypoint) pra rota avulsa do modo Manual. */
  routeDraft: Vec2Model[];
  onMoveRaw: (left: number, right: number) => ApiResult;
  onMode: (mode: RobotControlMode) => ApiResult;
  onRgb: (rgb: RgbColorModel) => ApiResult;
  onAssign: (taskId: string) => ApiResult;
  /** Tarefa escolhida no seletor do Semi-auto — o mapa mostra a rota dela antes de atribuir. */
  onPreviewTask: (taskId: string | null) => void;
  onThreshold: (mm: number) => ApiResult;
  onSendRoute: (threshold: number) => ApiResult;
  onClearRoute: () => void;
  onResendRoute: () => ApiResult;
}

export function VisRobotDrawer(props: VisRobotDrawerProps) {
  return (
    <Drawer open={props.robot !== null} onClose={props.onClose} title={props.robot ? `Robô ${props.label}` : 'Robô'}>
      {props.robot && <VisRobotPanel key={props.robot.robot.address} {...props} robot={props.robot} />}
    </Drawer>
  );
}

function VisRobotPanel({
  robot: v,
  now,
  connected,
  task,
  pendingTasks,
  routeDraft,
  onMoveRaw,
  onMode,
  onRgb,
  onAssign,
  onPreviewTask,
  onThreshold,
  onSendRoute,
  onClearRoute,
  onResendRoute,
}: VisRobotDrawerProps & { robot: VisRobotModel }) {
  const [speed, setSpeed] = useState(80);
  const [routeThreshold, setRouteThreshold] = useState(DEFAULT_WAYPOINT_THRESHOLD_MM);
  const [error, setError] = useState<string | null>(null);

  const { robot, telemetry } = v;
  const adv = telemetry?.advertisement ?? null;
  const pos = VisRobotMapper.position(telemetry);
  const mode = robot.mode;
  const wireAuto = adv?.mode === DotBotControlMode.Auto;
  const age = v.receivedAt !== null ? Math.max(0, Math.round((now - v.receivedAt) / 1000)) : null;
  const headingDeg = ((v.theta * RAD_TO_DEG) % 360 + 360) % 360;

  /** Mostra o erro da última ação (ou limpa, se deu certo) e devolve o resultado. */
  function report(result: ApiResult): ApiResult {
    void result.then(setError);
    return result;
  }

  return (
    <DrawerBody>
      <StatusLine tone={STATUS_TONE[robot.status]}>
        API: {SimRobotMapper.statusLabel(robot.status)}
        <StatusSep />
        {age !== null ? `telemetria há ${age} s` : 'sem telemetria desde que a tela abriu'}
      </StatusLine>
      <DrawerHint mono>
        {robot.name} · {robot.address}
      </DrawerHint>

      <KeyValueList
        items={[
          { label: 'pos (mm)', value: pos ? `x=${pos.x.toFixed(0)} y=${pos.y.toFixed(0)}` : adv ? 'sem localização' : '—' },
          { label: 'rumo', value: adv ? (adv.direction === -1 ? 'sem leitura' : `${headingDeg.toFixed(0)}°`) : '—' },
          { label: 'modo (fio)', value: adv ? (wireAuto ? 'AUTO' : 'MANUAL') : '—' },
          {
            label: 'bateria',
            value: adv
              ? `${VisRobotMapper.batteryPercent(adv.battery)}% (${(adv.battery / 1000).toFixed(2)} V)`
              : `${robot.battery.toFixed(2)} V (gravado na API)`,
          },
          { label: 'pwm L/R', value: adv ? `${adv.pwm_left} / ${adv.pwm_right}` : '—' },
          { label: 'encoders', value: adv ? `${adv.encoder_left} / ${adv.encoder_right}` : '—' },
          {
            label: 'wp_idx',
            value: adv ? (wireAuto ? `${adv.waypoint_idx} → (${adv.waypoint_x}, ${adv.waypoint_y})` : String(adv.waypoint_idx)) : '—',
          },
          { label: 'tarefa', value: task ? task.name : robot.taskId ? `${robot.taskId.slice(0, 8)}…` : '—' },
        ]}
      />

      <DrawerSection title="Comandos (API)" />
      {!connected && <DrawerHint>Sem conexão com a API — os comandos não chegam no robô.</DrawerHint>}

      <RobotModeField value={mode} onChange={(m) => void report(onMode(m))} />
      {error && <DrawerError>{error}</DrawerError>}

      {mode === RobotControlMode.Manual && (
        <>
          {/* O theta é o `direction` da última telemetria: com advertisement lento, o giro automático corrige atrasado. */}
          <ManualDrive theta={v.theta} speed={speed} onSpeedChange={setSpeed} onDrive={(l, r) => void report(onMoveRaw(l, r))} />
          <RouteDraftSection
            draftCount={routeDraft.length}
            threshold={routeThreshold}
            onThresholdChange={setRouteThreshold}
            onSend={() => void report(onSendRoute(routeThreshold))}
            onClear={onClearRoute}
            onResend={() => void report(onResendRoute())}
            canResend={v.route !== null}
            resendLabel="Reenviar última"
            resendTitle="Reenvia a última rota mandada desta tela (volta ao ponto 1)"
          />
        </>
      )}

      {(mode === RobotControlMode.SemiAuto || mode === RobotControlMode.Auto) && (
        <RobotTaskSection
          key={`${robot.address}-${mode}`}
          semiAuto={mode === RobotControlMode.SemiAuto}
          task={task}
          hasTask={robot.taskId !== null}
          wpIdx={adv?.waypoint_idx ?? null}
          threshold={robot.waypointsThreshold}
          pendingTasks={pendingTasks}
          onAssign={(id) => void report(onAssign(id))}
          onPreview={onPreviewTask}
          onThreshold={(mm) => report(onThreshold(mm))}
        />
      )}

      <DrawerDivider />
      <LedControl value={v.rgb} onApply={(color) => void report(onRgb(color))} />
    </DrawerBody>
  );
}

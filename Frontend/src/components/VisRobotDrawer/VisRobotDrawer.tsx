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
import { DEFAULT_WAYPOINT_THRESHOLD_MM, RAD_TO_DEG } from '../../Consts/SimulationConsts';
import { PositionSource } from '../../enums/PositionSource.enum';
import { RobotControlMode } from '../../enums/RobotControlMode.enum';
import { NetStatsMapper } from '../../mapper/NetStats.Mapper';
import { RobotMapper } from '../../mapper/Robot.Mapper';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import { VisRobotMapper } from '../../mapper/VisRobot.Mapper';
import type { RgbColorModel } from '../../model/SimRobot.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';
import type { TaskModel } from '../../model/Task.Model';
import type { RobotNetSnapshotModel } from '../../model/VisNetStats.Model';
import type { VisRobotModel } from '../../model/VisRobot.Model';

/** Toda ação do drawer vira uma chamada da API: resolve com a mensagem de erro, ou null. */
type ApiResult = Promise<string | null>;

// ---------------------------------------------------------------------------
// Drawer do robô no Visualizador: a telemetria que a API manda + as mesmas
// seções de comando do drawer da Simulação (RobotModeField, ManualDrive,
// RouteDraftSection, RobotTaskSection, LedControl), sem o que é do mundo
// simulado (derrubar/religar, swarmit). Cada ação vira uma rota da API (ver
// Integration/ApiLink.ts) e o erro dela aparece aqui. A seção Rede mostra os
// números do robô na janela do cartão Rede (ver VisNetStats).
// ---------------------------------------------------------------------------

interface VisRobotDrawerProps {
  robot: VisRobotModel | null;
  label: string;
  onClose: () => void;
  /** Relógio da tela (ms), pro "telemetria há X s". */
  now: number;
  connected: boolean;
  /** Números de rede do robô na janela do cartão Rede (null = nada dele ainda). */
  net: RobotNetSnapshotModel | null;
  netWindowMs: number;
  expectedHz: number;
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
  net,
  netWindowMs,
  expectedHz,
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
  const gps = telemetry?.position?.source === PositionSource.GPS ? telemetry.position : null;
  const pos = VisRobotMapper.position(telemetry);
  const mode = robot.mode;
  const age = v.receivedAt !== null ? Math.max(0, Math.round((now - v.receivedAt) / 1000)) : null;
  const headingDeg = ((v.theta * RAD_TO_DEG) % 360 + 360) % 360;

  /** Mostra o erro da última ação (ou limpa, se deu certo) e devolve o resultado. */
  function report(result: ApiResult): ApiResult {
    void result.then(setError);
    return result;
  }

  return (
    <DrawerBody>
      <StatusLine tone={SimRobotMapper.statusTone(robot.status)}>
        API: {SimRobotMapper.statusLabel(robot.status)}
        <StatusSep />
        {age !== null ? `telemetria há ${age} s` : 'sem telemetria desde que a tela abriu'}
      </StatusLine>
      <DrawerHint mono>
        {robot.name} · {robot.address}
      </DrawerHint>

      <KeyValueList
        items={[
          gps
            ? { label: 'pos (GPS)', value: `lat=${gps.x.toFixed(6)} lon=${gps.y.toFixed(6)}` }
            : { label: 'pos (mm)', value: pos ? `x=${pos.x.toFixed(0)} y=${pos.y.toFixed(0)}` : telemetry ? 'sem localização' : '—' },
          {
            label: 'rumo',
            value: telemetry?.position ? (telemetry.position.direction === null ? 'sem leitura' : `${headingDeg.toFixed(0)}°`) : '—',
          },
          {
            label: 'bateria',
            value:
              telemetry?.battery != null
                ? `${RobotMapper.batteryToPercent(telemetry.battery)}% (${telemetry.battery.toFixed(2)} V)`
                : `${robot.battery.toFixed(2)} V (gravado na API)`,
          },
          { label: 'wp_idx', value: telemetry?.waypointIdx != null ? String(telemetry.waypointIdx) : '—' },
          { label: 'tarefa', value: task ? task.name : robot.taskId ? `${robot.taskId.slice(0, 8)}…` : '—' },
        ]}
      />

      <DrawerSection title="Rede" />
      {net ? (
        <>
          <KeyValueList items={NetStatsMapper.items(net, expectedHz)} />
          <DrawerHint>Janela de {NetStatsMapper.duration(netWindowMs)}, a mesma do cartão Rede.</DrawerHint>
        </>
      ) : (
        <DrawerHint>Nenhum anúncio nem comando deste robô desde que a tela abriu.</DrawerHint>
      )}

      <DrawerSection title="Comandos (API)" />
      {!connected && <DrawerHint>Sem conexão com a API — os comandos não chegam no robô.</DrawerHint>}

      <RobotModeField value={mode} onChange={(m) => void report(onMode(m))} />
      {error && <DrawerError>{error}</DrawerError>}

      {mode === RobotControlMode.Manual && (
        <>
          <ManualDrive speed={speed} onSpeedChange={setSpeed} onDrive={(l, r) => void report(onMoveRaw(l, r))} />
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
          wpIdx={telemetry?.waypointIdx ?? null}
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

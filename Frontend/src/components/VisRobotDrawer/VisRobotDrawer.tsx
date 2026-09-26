import { useEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { Button } from '../Button/Button';
import { Drawer } from '../Drawer/Drawer';
import {
  DrawerActions,
  DrawerBody,
  DrawerDivider,
  DrawerError,
  DrawerField,
  DrawerHint,
  DrawerRow,
  DrawerSection,
  DrawerSubtitle,
} from '../Drawer/DrawerForm';
import { Joystick } from '../Joystick/Joystick';
import { Segmented } from '../Segmented/Segmented';
import { num } from '../SimRobotDrawer/numInput';
import { DEFAULT_WAYPOINT_THRESHOLD_MM, PWM_MAX, RAD_TO_DEG } from '../../Consts/SimulationConsts';
import { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import { RobotControlMode } from '../../enums/RobotControlMode.enum';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { ORCHESTRATOR_RUN_S } from '../../Integration/LocalOrchestrator';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import { VisRobotMapper } from '../../mapper/VisRobot.Mapper';
import type { RgbColorModel } from '../../model/SimRobot.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';
import type { TaskModel } from '../../model/Task.Model';
import type { VisRobotModel } from '../../model/VisRobot.Model';
import { joystickToWheels } from './joystickDrive';
import type { DriveCommand } from './joystickDrive';
import styles from './VisRobotDrawer.module.css';

// Modos de ORQUESTRAÇÃO do backend (RobotControlMode), não o modo do fio.
const MODE_OPTIONS: { value: RobotControlMode; label: string; title: string }[] = [
  { value: RobotControlMode.Manual, label: 'Manual', title: 'Dirigido no joystick (CMD_MOVE_RAW); o orquestrador não mexe' },
  { value: RobotControlMode.SemiAuto, label: 'Semi-auto', title: 'Executa tarefas sozinho, mas só as que você atribui' },
  { value: RobotControlMode.Auto, label: 'Auto', title: `Pega sozinho a próxima tarefa da fila (rodada a cada ${ORCHESTRATOR_RUN_S} s no backend)` },
];

const MODE_HINT: Record<RobotControlMode, string> = {
  [RobotControlMode.Manual]: 'Você dirige: joystick ou uma rota avulsa (LH2_WAYPOINTS) — o orquestrador não mexe neste robô.',
  [RobotControlMode.SemiAuto]:
    'Executa tarefas sozinho (segue os waypoints), mas só recebe tarefa atribuída por você — fica fora da fila do orquestrador.',
  [RobotControlMode.Auto]: `Entra na fila: a cada ${ORCHESTRATOR_RUN_S} s o orquestrador do backend dá a próxima tarefa pendente (menor prioridade primeiro) a um robô Auto livre.`,
};

const STATUS_DOT: Record<RobotStatus, string> = {
  [RobotStatus.Active]: styles.dotOn,
  [RobotStatus.Inactive]: styles.dotWarn,
  [RobotStatus.Lost]: styles.dotOff,
};

/** Frequência do CMD_MOVE_RAW enquanto arrasta — a mesma da Simulação. */
const JOYSTICK_HZ = 20;

/** Toda ação do drawer vira uma chamada da API: resolve com a mensagem de erro, ou null. */
type ApiResult = Promise<string | null>;

// ---------------------------------------------------------------------------
// Drawer do robô no Visualizador — o drawer do modo Simular da Simulação sem
// o que é do mundo simulado (derrubar/religar, swarmit): telemetria da API +
// os comandos que a API tem. Cada botão vira uma rota da API (ver
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
  const [color, setColor] = useState(() => SimRobotMapper.rgbToHex(v.rgb ?? { r: 255, g: 140, b: 0 }));
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<DriveCommand | null>(null);
  const turnSide = useRef(0);

  const { robot, telemetry } = v;
  const adv = telemetry?.advertisement ?? null;
  const pos = VisRobotMapper.position(telemetry);
  const mode = robot.mode;
  const wireAuto = adv?.mode === DotBotControlMode.Auto;

  /** Mostra o erro da última ação (ou limpa, se deu certo). */
  function report(result: ApiResult): ApiResult {
    void result.then(setError);
    return result;
  }

  // Chamado a JOYSTICK_HZ pelo Joystick (e com (0, 0) ao soltar). O theta é o
  // `direction` da última telemetria — com advertisement lento, o giro
  // automático corrige atrasado.
  function handleJoystick(x: number, y: number) {
    const cmd = joystickToWheels(x, y, v.theta, speed, turnSide.current);
    turnSide.current = cmd.side;
    setSending(x === 0 && y === 0 ? null : cmd);
    report(onMoveRaw(cmd.left, cmd.right));
  }

  const age = v.receivedAt !== null ? Math.max(0, Math.round((now - v.receivedAt) / 1000)) : null;
  const headingDeg = ((v.theta * RAD_TO_DEG) % 360 + 360) % 360;

  return (
    <DrawerBody>
      <div className={styles.status}>
        <span className={`${styles.dot} ${STATUS_DOT[robot.status]}`} />
        API: {SimRobotMapper.statusLabel(robot.status)}
        <span className={styles.sep}>·</span>
        {age !== null ? `telemetria há ${age} s` : 'sem telemetria desde que a tela abriu'}
      </div>
      <DrawerHint className={styles.mono}>
        {robot.name} · {robot.address}
      </DrawerHint>

      <dl className={styles.kv}>
        <dt>pos (mm)</dt>
        <dd>{pos ? `x=${pos.x.toFixed(0)} y=${pos.y.toFixed(0)}` : adv ? 'sem localização' : '—'}</dd>
        <dt>rumo</dt>
        <dd>{adv ? (adv.direction === -1 ? 'sem leitura' : `${headingDeg.toFixed(0)}°`) : '—'}</dd>
        <dt>modo (fio)</dt>
        <dd>{adv ? (wireAuto ? 'AUTO' : 'MANUAL') : '—'}</dd>
        <dt>bateria</dt>
        <dd>
          {adv
            ? `${VisRobotMapper.batteryPercent(adv.battery)}% (${(adv.battery / 1000).toFixed(2)} V)`
            : `${robot.battery.toFixed(2)} V (gravado na API)`}
        </dd>
        <dt>pwm L/R</dt>
        <dd>{adv ? `${adv.pwm_left} / ${adv.pwm_right}` : '—'}</dd>
        <dt>encoders</dt>
        <dd>{adv ? `${adv.encoder_left} / ${adv.encoder_right}` : '—'}</dd>
        <dt>wp_idx</dt>
        <dd>{adv ? (wireAuto ? `${adv.waypoint_idx} → (${adv.waypoint_x}, ${adv.waypoint_y})` : String(adv.waypoint_idx)) : '—'}</dd>
        <dt>tarefa</dt>
        <dd>{task ? task.name : robot.taskId ? `${robot.taskId.slice(0, 8)}…` : '—'}</dd>
      </dl>

      <DrawerSection title="Comandos (API)" />
      {!connected && <DrawerHint>Sem conexão com a API — os comandos não chegam no robô.</DrawerHint>}

      <DrawerField as="div" label="Modo">
        <Segmented options={MODE_OPTIONS} value={mode} onChange={(m) => void report(onMode(m))} ariaLabel="Modo de controle" />
      </DrawerField>
      <DrawerHint>{MODE_HINT[mode]}</DrawerHint>
      {error && <DrawerError>{error}</DrawerError>}

      {mode === RobotControlMode.Manual && (
        <>
          <DrawerField
            label={
              <span>
                Joystick (CMD_MOVE_RAW) · velocidade máx. <strong>{speed}</strong>/127
              </span>
            }
          >
            <input type="range" min={10} max={PWM_MAX} value={speed} onChange={num(setSpeed)} />
          </DrawerField>
          <Joystick onChange={handleJoystick} rateHz={JOYSTICK_HZ} />
          <p className={styles.joystickReadout}>
            {sending ? `rumo ${sending.headingDeg.toFixed(0)}° · enviando L=${sending.left} R=${sending.right}` : 'solto — robô parado'}
          </p>
          <DrawerHint>
            Arraste pra direção do mapa em que o robô deve ir: ele gira sozinho até apontar pra lá (pelo rumo da telemetria)
            e anda — quanto mais longe do centro, mais rápido. Enquanto arrasta, manda CMD_MOVE_RAW a {JOYSTICK_HZ} Hz pela
            API; ao soltar, manda a parada.
          </DrawerHint>

          <DrawerField as="div" label="Rota avulsa (LH2_WAYPOINTS)">
            <span className={styles.fieldHint}>
              {routeDraft.length > 0
                ? `${routeDraft.length} ponto(s) montado(s) — laranja no mapa.`
                : 'Ligue a ferramenta Waypoint no mapa e clique pra montar a rota deste robô.'}
            </span>
          </DrawerField>
          <DrawerRow>
            <DrawerField label="Raio (mm)">
              <input type="number" min={5} step={5} value={routeThreshold} onChange={num((val) => val > 0 && setRouteThreshold(val))} />
            </DrawerField>
          </DrawerRow>
          <DrawerActions>
            <Button variant="accent" onClick={() => void report(onSendRoute(routeThreshold))} disabled={routeDraft.length === 0}>
              Enviar rota
            </Button>
            <Button variant="outline" onClick={onClearRoute} disabled={routeDraft.length === 0}>
              Limpar
            </Button>
            <Button
              variant="outline"
              onClick={() => void report(onResendRoute())}
              disabled={!v.route}
              title="Reenvia a última rota mandada desta tela (volta ao ponto 1)"
            >
              Reenviar última
            </Button>
          </DrawerActions>
          <DrawerHint>O robô segue a rota sozinho (entra em AUTO no fio) até você mexer no joystick de novo.</DrawerHint>
        </>
      )}

      {(mode === RobotControlMode.SemiAuto || mode === RobotControlMode.Auto) && (
        <TaskSection
          key={`${robot.address}-${mode}`}
          semiAuto={mode === RobotControlMode.SemiAuto}
          hasTask={robot.taskId !== null}
          task={task}
          wpIdx={adv?.waypoint_idx ?? null}
          threshold={robot.waypointsThreshold}
          pendingTasks={pendingTasks}
          onAssign={(id) => void report(onAssign(id))}
          onPreview={onPreviewTask}
          onThreshold={(mm) => report(onThreshold(mm))}
        />
      )}

      <DrawerDivider />
      <DrawerRow>
        <DrawerField label="LED (CMD_RGB_LED)">
          <input type="color" className={styles.colorInput} value={color} onChange={(e) => setColor(e.target.value)} />
        </DrawerField>
        <DrawerField as="div" label={' '}>
          <DrawerActions>
            <Button variant="outline" onClick={() => void report(onRgb(SimRobotMapper.hexToRgb(color)))}>
              Acender
            </Button>
            <Button variant="outline" onClick={() => void report(onRgb({ r: 0, g: 0, b: 0 }))}>
              Apagar
            </Button>
          </DrawerActions>
        </DrawerField>
      </DrawerRow>
    </DrawerBody>
  );
}

// ---------------------------------------------------------------------------
// Tarefa do robô (Semi-auto e Auto). A tela não cria tarefa — só escolhe
// entre as que a API tem. No Semi-auto: sem tarefa, escolher uma pendente
// (o mapa mostra a rota) e Atribuir. Cancelar/Trocar no meio (que a
// Simulação tem) ainda não existe na API. No Auto, só acompanhar.
// ---------------------------------------------------------------------------

interface TaskSectionProps {
  semiAuto: boolean;
  hasTask: boolean;
  task: TaskModel | null;
  wpIdx: number | null;
  threshold: number;
  pendingTasks: readonly TaskModel[];
  onAssign: (taskId: string) => void;
  onPreview: (taskId: string | null) => void;
  onThreshold: (mm: number) => ApiResult;
}

function TaskSection({ semiAuto, hasTask, task, wpIdx, threshold, pendingTasks, onAssign, onPreview, onThreshold }: TaskSectionProps) {
  // A lista da API vem sem os pontos: não dá pra filtrar por "tem rota" — quem recusa tarefa vazia é o backend.
  const assignable = pendingTasks.filter((t) => t.uuid !== task?.uuid);
  const [picked, setPicked] = useState('');
  const pickedId = assignable.some((t) => t.uuid === picked) ? picked : (assignable[0]?.uuid ?? '');
  const previewId = semiAuto && !hasTask && pickedId ? pickedId : null;

  // Mostra no mapa a rota da tarefa escolhida; some ao sair/atribuir.
  const onPreviewRef = useRef(onPreview);
  useEffect(() => {
    onPreviewRef.current = onPreview;
  });
  useEffect(() => {
    onPreviewRef.current(previewId);
  }, [previewId]);
  useEffect(() => () => onPreviewRef.current(null), []);

  // Raio de chegada: confirma ao sair do campo ou com Enter; se a API recusar, volta ao valor dela.
  function commitThreshold(input: HTMLInputElement) {
    const mm = Math.round(Number(input.value));
    if (!Number.isFinite(mm) || mm <= 0 || mm === threshold) {
      input.value = String(threshold);
      return;
    }
    void onThreshold(mm).then((err) => {
      if (err) input.value = String(threshold);
    });
  }

  const count = task?.waypoints.length ?? 0;
  const progress =
    count > 0 && wpIdx !== null ? `ponto ${Math.min(wpIdx + 1, count)}/${count}` : wpIdx !== null ? `wp ${wpIdx}` : '';

  return (
    <>
      <DrawerSubtitle>Tarefa</DrawerSubtitle>
      {hasTask ? (
        <>
          <div className={styles.taskCurrent}>
            <strong>{task?.name ?? 'tarefa atribuída'}</strong>
            <span>{progress}</span>
          </div>
          {count > 0 && wpIdx !== null && (
            <div className={styles.progress} title="waypoint_idx do último advertisement">
              <div className={styles.progressBar} style={{ width: `${Math.round((Math.min(wpIdx, count) / count) * 100)}%` }} />
            </div>
          )}
          {semiAuto && <DrawerHint>Cancelar ou trocar a tarefa no meio ainda não existe na API — o robô segue até concluir.</DrawerHint>}
        </>
      ) : semiAuto ? (
        <>
          <DrawerField label="Escolher tarefa">
            {assignable.length > 0 ? (
              <select value={pickedId} onChange={(e) => setPicked(e.target.value)}>
                {assignable.map((t) => (
                  <option key={t.uuid} value={t.uuid}>
                    {t.name} · prioridade {t.priority}
                    {t.waypoints.length > 0 ? ` · ${t.waypoints.length} ponto(s)` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span className={styles.fieldHint}>Nenhuma tarefa pendente na API.</span>
            )}
          </DrawerField>
          {assignable.length > 0 && (
            <>
              <DrawerHint>A rota da tarefa escolhida aparece em rosa no mapa (quando a API manda os pontos).</DrawerHint>
              <DrawerActions>
                <Button variant="accent" onClick={() => pickedId && onAssign(pickedId)}>
                  Atribuir
                </Button>
              </DrawerActions>
            </>
          )}
        </>
      ) : (
        <DrawerHint>
          Livre — esperando tarefa da fila ({assignable.length} pendente(s)); o orquestrador do backend roda a cada{' '}
          {ORCHESTRATOR_RUN_S} s.
        </DrawerHint>
      )}

      <DrawerRow>
        <DrawerField label="Raio de chegada (mm)">
          <input
            key={threshold}
            type="number"
            min={5}
            step={5}
            defaultValue={threshold}
            onBlur={(e: FocusEvent<HTMLInputElement>) => commitThreshold(e.currentTarget)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && commitThreshold(e.currentTarget)}
            title="waypointsThreshold do robô na API — vale a partir da próxima tarefa (confirma ao sair do campo ou com Enter)"
          />
        </DrawerField>
      </DrawerRow>
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../Button/Button';
import { Drawer } from '../Drawer/Drawer';
import { Joystick } from '../Joystick/Joystick';
import { Segmented } from '../Segmented/Segmented';
import { DEFAULT_WAYPOINT_THRESHOLD_MM, DEG_TO_RAD, PWM_MAX, RAD_TO_DEG } from '../../Consts/SimulationConsts';
import { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import { RobotControlMode } from '../../enums/RobotControlMode.enum';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { SwarmitDeviceStatus } from '../../enums/SwarmitDeviceStatus.enum';
import { ORCHESTRATOR_RUN_S } from '../../Integration/LocalOrchestrator';
import { swarmitStatusName } from '../../Integration/Protocols/Swarmit/Swarmit.Protocol';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import type { RgbColorModel, SimRobotModel } from '../../model/SimRobot.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';
import type { TaskModel } from '../../model/Task.Model';
import type { SwarmitDeviceView } from '../../screens/Simulation/SimGateway';
import { normalizeAngle } from '../../screens/Simulation/SimRobot';
import type { BackendRobotInfo } from '../../screens/Simulation/useSimulation';
import styles from './SimRobotDrawer.module.css';

// Modos de ORQUESTRAÇÃO do backend (RobotControlMode), não o modo do fio.
const MODE_OPTIONS: { value: RobotControlMode; label: string; title: string }[] = [
  { value: RobotControlMode.Manual, label: 'Manual', title: 'Dirigido no joystick (CMD_MOVE_RAW); o orquestrador não mexe' },
  { value: RobotControlMode.SemiAuto, label: 'Semi-auto', title: 'Executa tarefas sozinho, mas só as que você atribui' },
  { value: RobotControlMode.Auto, label: 'Auto', title: `Pega sozinho a próxima tarefa da fila (rodada a cada ${ORCHESTRATOR_RUN_S} s)` },
];

const MODE_HINT: Record<RobotControlMode, string> = {
  [RobotControlMode.Manual]: 'Você dirige: joystick ou uma rota avulsa (LH2_WAYPOINTS) — o orquestrador não mexe neste robô.',
  [RobotControlMode.SemiAuto]:
    'Executa tarefas sozinho (segue os waypoints), mas só recebe tarefa atribuída por você — fica fora da fila do orquestrador.',
  [RobotControlMode.Auto]: `Entra na fila: a cada ${ORCHESTRATOR_RUN_S} s o orquestrador dá a próxima tarefa pendente (menor prioridade primeiro) a um robô Auto livre.`,
};

function num(handler: (v: number) => void) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (Number.isFinite(v)) handler(v);
  };
}

/** Frequência do CMD_MOVE_RAW enquanto arrasta (topo da faixa 10–20 Hz da malha manual). */
const JOYSTICK_HZ = 20;
/** Giro automático: PWM de diferença entre as rodas por rad de erro de rumo. */
const HEADING_KP = 40;
/** Teto do PWM de giro — mais que isso o robô passa do rumo entre dois comandos (20 Hz). */
const TURN_PWM_MAX = 50;
/** cos(60°): com o rumo fora desse cone o robô só gira no lugar; dentro, anda e vai corrigindo. */
const DRIVE_CONE_COS = 0.5;
/** Perto de 180° o erro troca de sinal à toa — nessa zona mantém o lado do giro que já estava. */
const FLIP_ZONE_RAD = 150 * DEG_TO_RAD;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

interface DriveCommand {
  left: number;
  right: number;
  /** Rumo pedido no mapa, em graus (0° = direita, 90° = pra cima — mesma convenção do theta). */
  headingDeg: number;
  /** Lado do giro (+1 anti-horário, -1 horário, 0 alinhado) — vira o `keepSide` do próximo comando. */
  side: number;
}

/**
 * Manche → CMD_MOVE_RAW com giro AUTOMÁTICO (joystick "de jogo"): a direção
 * do manche é a direção no MAPA pra onde o robô deve ir (pra cima = +Y do
 * mundo), não frente/giro do robô. A partir do theta atual o controlador
 * calcula o erro de rumo, gira as rodas em sentidos opostos até apontar pra
 * lá e, dentro do cone de 60°, soma o avanço — proporcional a quanto a
 * bolinha foi arrastada e a quão alinhado já está. Saída: PWM das duas rodas
 * (int8 do CMD_MOVE_RAW, ±127), com o giro preservado se somar passar de 127.
 */
function joystickToWheels(x: number, y: number, theta: number, maxPwm: number, keepSide: number): DriveCommand {
  const mag = Math.min(1, Math.hypot(x, y));
  const heading = Math.atan2(y, x);
  if (mag === 0) return { left: 0, right: 0, headingDeg: 0, side: 0 };

  let err = normalizeAngle(heading - theta);
  if (keepSide !== 0 && Math.abs(err) > FLIP_ZONE_RAD && Math.sign(err) !== keepSide) {
    err -= Math.sign(err) * 2 * Math.PI; // mesmo rumo, pelo lado que já estava girando
  }

  const turnMax = Math.min(TURN_PWM_MAX, maxPwm);
  const turn = clamp(HEADING_KP * err, -turnMax, turnMax); // > 0 = anti-horário = roda direita mais rápida
  const aligned = clamp((Math.cos(err) - DRIVE_CONE_COS) / (1 - DRIVE_CONE_COS), 0, 1);
  const forward = Math.min(mag * maxPwm * aligned, PWM_MAX - Math.abs(turn));

  return {
    left: Math.round(forward - turn),
    right: Math.round(forward + turn),
    headingDeg: ((heading * RAD_TO_DEG) % 360 + 360) % 360,
    side: turn === 0 ? keepSide : Math.sign(turn),
  };
}

// ---------------------------------------------------------------------------
// Modo Simular — telemetria + comandos. A tela faz o papel do backend: cada
// botão vira um comando que DESCE pelo gateway simulado (e pelo modelo de
// rede — com PDR < 100% pode se perder), exatamente como viria da API.
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
  /** Task escolhida no seletor do Semi-auto — o mapa mostra a rota dela antes de atribuir. */
  onPreviewTask: (taskId: string | null) => void;
  onThreshold: (mm: number) => void;
  onSendRoute: (threshold: number) => void;
  onClearRoute: () => void;
  onResendRoute: () => void;
  onSwarmit: (action: 'start' | 'stop' | 'reset') => void;
  onFlash: () => void;
}

const STATUS_LABEL: Record<RobotStatus, string> = {
  [RobotStatus.Active]: 'Active',
  [RobotStatus.Inactive]: 'Inactive',
  [RobotStatus.Lost]: 'Lost',
};

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
  const [color, setColor] = useState(() => SimRobotMapper.rgbToHex(robot.rgb.r || robot.rgb.g || robot.rgb.b ? robot.rgb : { r: 255, g: 140, b: 0 }));
  const [error, setError] = useState<string | null>(null);

  const wireAuto = robot.mode === DotBotControlMode.Auto;
  const lastAdv = backend?.view?.lastAdvertisementAt ?? null;
  const record = backend?.record ?? null;
  const mode = record?.mode ?? null;
  const [sending, setSending] = useState<DriveCommand | null>(null);
  const turnSide = useRef(0);

  // Chamado a JOYSTICK_HZ pelo Joystick (e com (0, 0) ao soltar). O theta é o
  // da pose que o mapa mostra — com a API real, vira o `direction` do
  // DOTBOT_ADVERTISEMENT (e aí o advertise_hz precisa acompanhar essa malha).
  function handleJoystick(x: number, y: number) {
    const cmd = joystickToWheels(x, y, robot.theta, speed, turnSide.current);
    turnSide.current = cmd.side;
    setSending(x === 0 && y === 0 ? null : cmd);
    onMoveRaw(cmd.left, cmd.right);
  }

  function handleMode(next: RobotControlMode) {
    setError(onMode(next));
  }

  const canCommand = robot.online && robot.appRunning;

  return (
    <div className={styles.section}>
      <div className={styles.status}>
        <span className={`${styles.dot} ${robot.online ? styles.dotOn : styles.dotOff}`} />
        {robot.online ? 'na rede' : 'fora da rede'}
        <span className={styles.sep}>·</span>
        API: {backend?.status !== null && backend?.status !== undefined ? STATUS_LABEL[backend.status] : 'não cadastrado'}
        {lastAdv !== null && ` (há ${(now - lastAdv).toFixed(1)} s)`}
      </div>
      <p className={styles.hint} style={{ fontFamily: 'var(--font-mono)' }}>
        {robot.address}
      </p>

      <dl className={styles.kv}>
        <dt>pos (mm)</dt>
        <dd>
          x={robot.pos_x.toFixed(0)} y={robot.pos_y.toFixed(0)}
        </dd>
        <dt>theta</dt>
        <dd>{(robot.theta * RAD_TO_DEG).toFixed(1)}°</dd>
        <dt>modo (fio)</dt>
        <dd>{wireAuto ? (robot.loop ? 'AUTO (loop)' : 'AUTO') : 'MANUAL'}</dd>
        <dt>bateria</dt>
        <dd>{robot.battery.toFixed(1)}%</dd>
        <dt>pwm L/R</dt>
        <dd>
          {robot.pwm_left} / {robot.pwm_right}
        </dd>
        <dt>encoders</dt>
        <dd>
          {robot.encoder_left.toFixed(0)} / {robot.encoder_right.toFixed(0)}
        </dd>
        <dt>wp_idx</dt>
        <dd>
          {robot.waypoints.length > 0
            ? `${robot.waypoint_idx}/${robot.waypoints.length}${robot.loop ? ' (loop)' : robot.waypoint_idx >= robot.waypoints.length ? ' (fim)' : ''}`
            : '—'}
        </dd>
        <dt>app</dt>
        <dd>{robot.appRunning ? 'rodando' : 'parado (bootloader)'}</dd>
      </dl>

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

      <hr className={styles.divider} />
      <p className={styles.subtitle}>Comandos (backend)</p>
      {!canCommand && (
        <p className={styles.hint}>
          {robot.online ? 'App parado no bootloader — mande START na seção Swarmit.' : 'Fora da rede — comandos não chegam.'}
        </p>
      )}

      <div className={styles.field}>
        Modo
        {mode !== null ? (
          <Segmented options={MODE_OPTIONS} value={mode} onChange={handleMode} ariaLabel="Modo de controle" />
        ) : (
          <span className={styles.hint}>O backend ainda não cadastrou este robô — espera o primeiro DOTBOT_ADVERTISEMENT.</span>
        )}
      </div>
      {mode !== null && <p className={styles.hint}>{MODE_HINT[mode]}</p>}
      {error && <p className={styles.error}>{error}</p>}

      {mode === RobotControlMode.Manual && (
        <>
          <label className={styles.field}>
            <span>
              Joystick (CMD_MOVE_RAW) · velocidade máx. <strong>{speed}</strong>/127
            </span>
            <input type="range" min={10} max={PWM_MAX} value={speed} onChange={num(setSpeed)} />
          </label>
          <Joystick onChange={handleJoystick} rateHz={JOYSTICK_HZ} />
          <p className={styles.joystickReadout}>
            {sending ? `rumo ${sending.headingDeg.toFixed(0)}° · enviando L=${sending.left} R=${sending.right}` : 'solto — robô parado'}
          </p>
          <p className={styles.hint}>
            Arraste pra direção do mapa em que o robô deve ir: ele gira sozinho até apontar pra lá e anda — quanto mais
            longe do centro, mais rápido. Enquanto arrasta, manda CMD_MOVE_RAW a {JOYSTICK_HZ} Hz; ao soltar, a bolinha
            volta pro centro e manda a parada.
          </p>

          <div className={styles.field}>
            Rota avulsa (LH2_WAYPOINTS)
            <span className={styles.hint}>
              {routeDraft.length > 0
                ? `${routeDraft.length} ponto(s) montado(s) — laranja no mapa.`
                : 'Ligue a ferramenta Waypoint no mapa e clique pra montar a rota deste robô.'}
            </span>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>
              Raio (mm)
              <input type="number" min={5} step={5} value={routeThreshold} onChange={num((v) => v > 0 && setRouteThreshold(v))} />
            </label>
          </div>
          <div className={styles.actions}>
            <Button variant="accent" onClick={() => onSendRoute(routeThreshold)} disabled={routeDraft.length === 0}>
              Enviar rota
            </Button>
            <Button variant="outline" onClick={onClearRoute} disabled={routeDraft.length === 0}>
              Limpar
            </Button>
            <Button variant="outline" onClick={onResendRoute} disabled={robot.waypoints.length === 0} title="Reenvia a rota atual do robô (volta ao ponto 1)">
              Reenviar atual
            </Button>
          </div>
          <p className={styles.hint}>
            O robô segue a rota sozinho (entra em AUTO no fio) até você mexer no joystick de novo.
          </p>
        </>
      )}

      {(mode === RobotControlMode.SemiAuto || mode === RobotControlMode.Auto) && record && (
        <TaskSection
          key={`${robot.address}-${mode}`}
          semiAuto={mode === RobotControlMode.SemiAuto}
          task={backend?.task ?? null}
          wpIdx={robot.waypoint_idx}
          threshold={record.waypointsThreshold}
          pendingTasks={pendingTasks}
          nextRunIn={nextRunIn}
          onAssign={(id) => setError(onAssign(id))}
          onPreview={onPreviewTask}
          onThreshold={onThreshold}
        />
      )}

      <hr className={styles.divider} />
      <div className={styles.fieldRow}>
        <label className={styles.field}>
          LED (CMD_RGB_LED)
          <input type="color" className={styles.colorInput} value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <div className={styles.field}>
          &nbsp;
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => onRgb(SimRobotMapper.hexToRgb(color))}>
              Acender
            </Button>
            <Button variant="outline" onClick={() => onRgb({ r: 0, g: 0, b: 0 })}>
              Apagar
            </Button>
          </div>
        </div>
      </div>

      {swarmitOn && (
        <>
          <hr className={styles.divider} />
          <p className={styles.subtitle}>Swarmit</p>
          <div className={styles.status}>
            estado: {device ? swarmitStatusName(device.status) : '—'}
            {device?.status === SwarmitDeviceStatus.Programming && ` · flash ${Math.round(device.flashProgress * 100)}%`}
          </div>
          {backend?.view?.otaProgress !== null && backend?.view?.otaProgress !== undefined && (
            <div className={styles.progress} title="Chunks com ACK vistos pelo backend">
              <div className={styles.progressBar} style={{ width: `${Math.round(backend.view.otaProgress * 100)}%` }} />
            </div>
          )}
          <div className={styles.actions}>
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
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarefa do robô (Semi-auto e Auto). A tela NÃO cria task — só seleciona
// entre as que o backend tem (mock enquanto não há API). Com tarefa em
// andamento: progresso. Sem tarefa: no Semi-auto, escolher uma pendente
// (o mapa mostra a rota dela) e Atribuir; no Auto, esperar a rodada.
// ---------------------------------------------------------------------------

interface TaskSectionProps {
  semiAuto: boolean;
  task: TaskModel | null;
  wpIdx: number;
  threshold: number;
  pendingTasks: readonly TaskModel[];
  nextRunIn: number;
  onAssign: (taskId: string) => void;
  onPreview: (taskId: string | null) => void;
  onThreshold: (mm: number) => void;
}

function TaskSection({ semiAuto, task, wpIdx, threshold, pendingTasks, nextRunIn, onAssign, onPreview, onThreshold }: TaskSectionProps) {
  const assignable = pendingTasks.filter((t) => t.waypoints.length > 0);
  const [picked, setPicked] = useState('');
  const pickedId = assignable.some((t) => t.uuid === picked) ? picked : (assignable[0]?.uuid ?? '');
  const previewId = semiAuto && !task && pickedId ? pickedId : null;

  // Mostra no mapa a rota da task escolhida; some ao sair/atribuir.
  const onPreviewRef = useRef(onPreview);
  useEffect(() => {
    onPreviewRef.current = onPreview;
  });
  useEffect(() => {
    onPreviewRef.current(previewId);
  }, [previewId]);
  useEffect(() => () => onPreviewRef.current(null), []);

  return (
    <>
      <p className={styles.subtitle}>Tarefa</p>
      {task ? (
        <>
          <div className={styles.taskCurrent}>
            <strong>{task.name}</strong>
            <span>
              ponto {Math.min(wpIdx + 1, task.waypoints.length)}/{task.waypoints.length}
            </span>
          </div>
          <div className={styles.progress} title="waypoint_idx do último advertisement">
            <div className={styles.progressBar} style={{ width: `${Math.round((Math.min(wpIdx, task.waypoints.length) / task.waypoints.length) * 100)}%` }} />
          </div>
        </>
      ) : semiAuto ? (
        <>
          <label className={styles.field}>
            Escolher tarefa
            {assignable.length > 0 ? (
              <select className={styles.select} value={pickedId} onChange={(e) => setPicked(e.target.value)}>
                {assignable.map((t) => (
                  <option key={t.uuid} value={t.uuid}>
                    {t.name} · prioridade {t.priority} · {t.waypoints.length} ponto(s)
                  </option>
                ))}
              </select>
            ) : (
              <span className={styles.hint}>Nenhuma tarefa pendente no backend.</span>
            )}
          </label>
          {assignable.length > 0 && (
            <>
              <p className={styles.hint}>A rota da tarefa escolhida aparece em rosa no mapa.</p>
              <div className={styles.actions}>
                <Button variant="accent" onClick={() => pickedId && onAssign(pickedId)}>
                  Atribuir
                </Button>
              </div>
            </>
          )}
        </>
      ) : (
        <p className={styles.hint}>
          Livre — esperando tarefa da fila ({assignable.length} pendente(s)); próxima rodada em {nextRunIn.toFixed(1)} s.
        </p>
      )}

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          Raio de chegada (mm)
          <input
            type="number"
            min={5}
            step={5}
            value={threshold}
            onChange={num((v) => v > 0 && onThreshold(v))}
            title="waypointsThreshold do robô — vale a partir da próxima tarefa"
          />
        </label>
      </div>
    </>
  );
}

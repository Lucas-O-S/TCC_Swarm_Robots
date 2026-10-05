import { useCallback, useEffect, useRef, useState } from 'react';
import type { RobotControlMode } from '../../enums/RobotControlMode.enum';
import { SocketEvents } from '../../enums/SocketEvents.enum';
import type { ApiLink, ApiLinkState } from '../../Integration/ApiLink';
import { API_NOT_CONNECTED, DisconnectedApiLink } from '../../Integration/DisconnectedApiLink';
import { controlModeLabel } from '../../Integration/LocalOrchestrator';
import type { CenarioModel } from '../../model/Cenario.Model';
import type { RgbColorModel } from '../../model/SimRobot.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';
import { CenarioService } from '../../services/Cenario.Service';
import type { ServiceResult } from '../../services/Robot.Service';
import { VisFleet } from './VisFleet';

// Ponte entre a API (pelo ApiLink) e o estado React da tela do
// Visualizador — o equivalente do useSimulation, sem motor: aqui nada é
// simulado. Os robôs são só os que a API conhece (GET /robots + robot:new),
// a pose e o resto da telemetria vêm do robot:update e o status
// (Active/Inactive/Lost) é o que o backend calcula (robot:status). Os
// comandos do drawer viram chamadas do ApiLink e devolvem a mensagem de erro
// da API (ou null), pra tela mostrar.
//
// SEM CONEXÃO POR ENQUANTO (pedido do dono: por ora é só a tela): o link é o
// DisconnectedApiLink, que não conecta em nada. Pra ligar na API, é trocar a
// linha marcada no efeito abaixo pela implementação real do ApiLink — a tela
// e o resto deste hook não mudam.

/** Telemetria de um robô que a lista ainda não tem (robot:new perdido?) → recarrega a lista depois disso. */
const UNKNOWN_ROBOT_RELOAD_MS = 1000;

const INITIAL_LINK: ApiLinkState = { status: 'connecting', message: 'Conectando à API…' };

export function useVisualizer() {
  /** Cenário pronto no formato do Construtor (células): só o mapa — os robôs vêm da API. */
  const [cenario, setCenario] = useState<CenarioModel | null>(null);
  const [link, setLink] = useState<ApiLinkState>(INITIAL_LINK);
  const [now, setNow] = useState(() => Date.now());
  const [, setFrame] = useState(0);

  const frameRef = useRef(0);
  const linkRef = useRef<ApiLink | null>(null);
  const reloadRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Vários eventos por quadro de tela (N robôs × taxa de advertisement) viram um render só.
  const scheduleRender = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      setFrame((f) => f + 1);
    });
  }, []);

  const [fleet] = useState(() => new VisFleet(scheduleRender));

  useEffect(() => {
    // ↓ Ligar na API = trocar pela implementação real do ApiLink (REST pelo Callout + socket.io).
    const api: ApiLink = new DisconnectedApiLink();
    linkRef.current = api;
    fleet.reset();
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    // Lista de robôs e tarefas + o último estado quente de cada robô (pra
    // desenhar quem está parado e não vai mandar robot:update tão cedo).
    async function reload() {
      const [robots, tasks] = await Promise.all([api.listRobots(), api.listTasks()]);
      if (linkRef.current !== api) return;
      if (robots.ok) {
        fleet.replaceRobots(robots.data);
        for (const r of robots.data) {
          void api.getTelemetry(r.address).then((res) => {
            if (linkRef.current !== api || !res.ok || !res.data) return;
            fleet.applyTelemetry(r.address, res.data, Math.min(Date.now(), res.data.updatedAt.getTime()));
          });
        }
      } else {
        fleet.log(`✕ GET /robots: ${robots.message}`);
      }
      if (tasks.ok) fleet.setTasks(tasks.data);
      else fleet.log(`✕ GET /tasks: ${tasks.message}`);
    }
    reloadRef.current = reload;

    api.onState((state) => {
      setLink(state);
      fleet.log(state.message);
      if (state.status === 'connected') void reload();
    });

    api.onEvent((event) => {
      switch (event.kind) {
        case SocketEvents.RobotUpdate:
          if (!fleet.applyTelemetry(event.address, event.telemetry, Date.now()) && !reloadTimer) {
            reloadTimer = setTimeout(() => {
              reloadTimer = null;
              void reload();
            }, UNKNOWN_ROBOT_RELOAD_MS);
          }
          break;
        case SocketEvents.RobotStatus:
          fleet.applyStatus(event.address, event.status);
          break;
        case SocketEvents.RobotNew:
          fleet.addRobot(event.robot);
          break;
      }
    });

    void api.start();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      linkRef.current = null;
      reloadRef.current = () => Promise.resolve();
      api.stop();
    };
  }, [fleet]);

  // Relógio da tela (pro "telemetria há X s" do drawer).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // ---- cenário -------------------------------------------------------------------

  /** Único cenário pronto por enquanto: o mapa mock do Construtor (a API ainda não tem rota de cenários). */
  const loadMockScenario = useCallback(() => setCenario(CenarioService.createMockMap().cenario), []);

  // ---- comandos (drawer) — cada um devolve o erro da API ou null ---------------------

  const command = useCallback(
    async (label: string, address: string, run: (api: ApiLink) => Promise<ServiceResult<unknown>>): Promise<string | null> => {
      const api = linkRef.current;
      const res: ServiceResult<unknown> = api ? await run(api) : { ok: false, message: API_NOT_CONNECTED };
      if (res.ok) {
        fleet.log(`⇩ ${label} → ${address}`);
        return null;
      }
      fleet.log(`✕ ${label} → ${address}: ${res.message}`);
      return res.message;
    },
    [fleet],
  );

  const moveRaw = useCallback(
    (address: string, left: number, right: number) =>
      command(`CMD_MOVE_RAW L=${left} R=${right}`, address, (api) => api.moveRaw(address, left, right)),
    [command],
  );

  const setRgb = useCallback(
    async (address: string, color: RgbColorModel) => {
      const error = await command(`CMD_RGB_LED (${color.r}, ${color.g}, ${color.b})`, address, (api) => api.rgbLed(address, color));
      if (!error) fleet.patch(address, (v) => ({ ...v, rgb: color.r || color.g || color.b ? color : null }));
      return error;
    },
    [command, fleet],
  );

  /** Modo de orquestração: depois do comando, recarrega a lista — o modo que vale é o que a API devolver. */
  const setMode = useCallback(
    async (address: string, mode: RobotControlMode) => {
      const error = await command(`CONTROL_MODE ${controlModeLabel(mode)}`, address, (api) => api.controlMode(address, mode));
      if (!error) void reloadRef.current();
      return error;
    },
    [command],
  );

  const sendWaypoints = useCallback(
    async (address: string, points: Vec2Model[], threshold: number) => {
      const error = await command(`LH2_WAYPOINTS ×${points.length} (thr ${threshold} mm)`, address, (api) =>
        api.waypoints(address, threshold, points),
      );
      if (!error) fleet.patch(address, (v) => ({ ...v, route: { points, threshold } }));
      return error;
    },
    [command, fleet],
  );

  const assignTask = useCallback(
    async (address: string, taskId: string) => {
      const name = fleet.tasks.find((t) => t.uuid === taskId)?.name ?? taskId;
      const error = await command(`atribuir tarefa "${name}"`, address, (api) => api.assignTask(address, taskId));
      if (!error) void reloadRef.current();
      return error;
    },
    [command, fleet],
  );

  const setThreshold = useCallback(
    async (address: string, mm: number) => {
      const uuid = fleet.get(address)?.robot.uuid;
      if (!uuid) return 'Robô não está mais na lista da API.';
      const error = await command(`waypointsThreshold ${mm} mm`, address, (api) => api.setWaypointsThreshold(uuid, mm));
      if (!error) fleet.patch(address, (v) => ({ ...v, robot: { ...v.robot, waypointsThreshold: mm } }));
      return error;
    },
    [command, fleet],
  );

  return {
    cenario,
    loadMockScenario,
    link,
    now,
    robots: fleet.robots,
    tasks: fleet.tasks,
    trails: fleet.trails,
    logEntries: fleet.entries,
    moveRaw,
    setRgb,
    setMode,
    sendWaypoints,
    assignTask,
    setThreshold,
  };
}

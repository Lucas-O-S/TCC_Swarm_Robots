import { useCallback, useEffect, useRef, useState } from 'react';
import type { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import type { RobotStatus } from '../../enums/RobotStatus.enum';
import { SwarmitPayloadType } from '../../enums/SwarmitPayloadType.enum';
import type { FleetCommand } from '../../Integration/FleetLink';
import { LocalFleetLink } from '../../Integration/LocalFleetLink';
import type { BackendRobotView, LinkLogEntry } from '../../Integration/LocalFleetLink';
import { ScenarioMapper } from '../../mapper/Scenario.Mapper';
import type { ScenarioModel, SimConfigModel } from '../../model/Scenario.Model';
import type { SimRobotModel } from '../../model/SimRobot.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';
import { SimGateway } from './SimGateway';
import type { SwarmitDeviceView } from './SimGateway';
import { planTicks } from './SimLoop';
import type { NetChannelStats } from './SimNetModel';
import type { SimWorld } from './SimWorld';

// Orquestra motor (SimWorld) + gateway (SimGateway) + transporte (FleetLink)
// + estado React da tela de Simulação — o equivalente do useWorld do
// RobotSwarmSimulator. O motor e o gateway não sabem nada de React; este
// hook é a única ponte.
//
// Dois modos, como no simulador de referência:
//   - EDITAR: a simulação NÃO roda — edita-se o estado INICIAL do cenário
//     (o "draft", formato JSON em mm/graus);
//   - SIMULAR: ScenarioMapper.toWorld(draft) do zero, com o gateway sempre
//     ligado num LocalFleetLink (offline — não há API ainda). Assim o ciclo
//     de vida da rede, o modelo de PDR/latência e os timers do backend
//     funcionam sem nenhum servidor.

export type SimMode = 'edit' | 'sim';

/** Configurações de rede vivas (view de world.sim no modo Simular, ou do draft no Editar). */
export interface NetConfigValues {
  enabled: boolean;
  pdr_percent: number;
  slot_latency_ms: number;
  jitter_ms: number;
}

interface Runtime {
  world: SimWorld;
  link: LocalFleetLink;
  gateway: SimGateway;
  ready: boolean;
}

const TRAIL_MAX_POINTS = 400;
const TRAIL_MIN_DIST_MM = 8;

function netConfigOf(sim: SimConfigModel): NetConfigValues {
  return {
    enabled: sim.net_enabled ?? true,
    pdr_percent: sim.pdr_percent,
    slot_latency_ms: sim.slot_latency_ms,
    jitter_ms: sim.jitter_ms ?? 0,
  };
}

function applyNetPatch(sim: SimConfigModel, patch: Partial<NetConfigValues>): SimConfigModel {
  const next = { ...sim };
  if (patch.enabled !== undefined) next.net_enabled = patch.enabled;
  if (patch.pdr_percent !== undefined) next.pdr_percent = Math.min(100, Math.max(0, patch.pdr_percent));
  if (patch.slot_latency_ms !== undefined) next.slot_latency_ms = Math.max(0, patch.slot_latency_ms);
  if (patch.jitter_ms !== undefined) next.jitter_ms = Math.max(0, patch.jitter_ms);
  return next;
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function useSimulation() {
  const [draft, setDraft] = useState<ScenarioModel | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [mode, setMode] = useState<SimMode>('edit');
  const [playing, setPlaying] = useState(true);
  const [swarmitEnabled, setSwarmitEnabledState] = useState(false);
  const [, setFrame] = useState(0);

  const runtimeRef = useRef<Runtime | null>(null);
  const trailsRef = useRef<Map<string, Vec2Model[]>>(new Map());
  const accRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const swarmitRef = useRef(false);

  const rerender = useCallback(() => setFrame((f) => f + 1), []);

  const stopRuntime = useCallback(() => {
    const rt = runtimeRef.current;
    runtimeRef.current = null;
    void rt?.gateway.stop();
  }, []);

  const startRuntime = useCallback(
    (scenario: ScenarioModel) => {
      stopRuntime();
      const world = ScenarioMapper.toWorld(scenario);
      const link = new LocalFleetLink({ clock: () => world.time });
      const gateway = new SimGateway({
        world,
        link,
        swarmitEnabled: swarmitRef.current,
        log: (msg) => link.log('gateway', msg),
      });
      const rt: Runtime = { world, link, gateway, ready: false };
      runtimeRef.current = rt;

      trailsRef.current = new Map(world.robots.map((r) => [r.address, [{ x: r.pos_x, y: r.pos_y }]]));
      accRef.current = 0;
      lastTsRef.current = null;

      void gateway.start().then(() => {
        if (runtimeRef.current !== rt) return;
        rt.ready = true;
        rerender();
      });
    },
    [stopRuntime, rerender],
  );

  useEffect(() => stopRuntime, [stopRuntime]);

  // Loop de animação: rAF com dt real → ticks FIXOS (planTicks) → gateway.
  useEffect(() => {
    if (mode !== 'sim' || !playing) {
      lastTsRef.current = null; // tempo pausado não vira dt
      return;
    }
    let raf = 0;
    const onFrame = (ts: number) => {
      const rt = runtimeRef.current;
      if (rt?.ready) {
        const last = lastTsRef.current;
        lastTsRef.current = ts;
        if (last !== null) {
          const plan = planTicks(accRef.current, (ts - last) / 1000, rt.world.tickDt);
          accRef.current = plan.acc;
          if (plan.ticks > 0) {
            rt.gateway.stepTicks(plan.ticks);
            rt.link.update();
            recordTrails(trailsRef.current, rt.world);
            setFrame((f) => f + 1);
          }
        }
      }
      raf = requestAnimationFrame(onFrame);
    };
    raf = requestAnimationFrame(onFrame);
    return () => cancelAnimationFrame(raf);
  }, [mode, playing]);

  // ---- cenário / modo ---------------------------------------------------------

  const load = useCallback(
    (scenario: ScenarioModel, name: string, target: SimMode) => {
      setDraft(scenario);
      setScenarioName(name);
      setMode(target);
      setPlaying(true);
      if (target === 'sim') startRuntime(scenario);
      else stopRuntime();
    },
    [startRuntime, stopRuntime],
  );

  const enterSim = useCallback(() => {
    if (!draft) return;
    startRuntime(draft);
    setMode('sim');
    setPlaying(true);
  }, [draft, startRuntime]);

  const enterEdit = useCallback(() => {
    stopRuntime();
    setMode('edit');
  }, [stopRuntime]);

  /** Recarrega o cenário do zero (valores de rede voltam aos do cenário). */
  const reset = useCallback(() => {
    if (draft && mode === 'sim') startRuntime(draft);
    rerender();
  }, [draft, mode, startRuntime, rerender]);

  const updateDraft = useCallback((fn: (s: ScenarioModel) => ScenarioModel) => {
    setDraft((prev) => (prev ? fn(prev) : prev));
  }, []);

  const setNetConfig = useCallback(
    (patch: Partial<NetConfigValues>) => {
      const rt = runtimeRef.current;
      if (mode === 'sim' && rt) {
        rt.world.sim = applyNetPatch(rt.world.sim, patch); // o gateway lê world.sim por mensagem: efeito imediato
        rerender();
      } else {
        updateDraft((s) => ({ ...s, sim: applyNetPatch(s.sim, patch) }));
      }
    },
    [mode, rerender, updateDraft],
  );

  const setSimParams = useCallback(
    (patch: Partial<Pick<SimConfigModel, 'tick_hz' | 'advertise_hz' | 'battery_drain_per_min'>>) => {
      updateDraft((s) => ({ ...s, sim: { ...s.sim, ...patch } }));
    },
    [updateDraft],
  );

  // ---- ações sobre a frota (o "backend de bolso") ---------------------------

  const send = useCallback(
    (cmd: FleetCommand) => {
      runtimeRef.current?.link.send(cmd);
      rerender();
    },
    [rerender],
  );

  const moveRaw = useCallback(
    (address: string, left: number, right: number) =>
      send({ kind: 'move-raw', destination: address, left_x: 0, left_y: left, right_x: 0, right_y: right }),
    [send],
  );
  const setControlMode = useCallback(
    (address: string, value: DotBotControlMode) => send({ kind: 'control-mode', destination: address, mode: value }),
    [send],
  );
  const setRgb = useCallback(
    (address: string, red: number, green: number, blue: number) => send({ kind: 'rgb', destination: address, red, green, blue }),
    [send],
  );
  const sendWaypoints = useCallback(
    (address: string, waypoints: Vec2Model[], threshold: number) =>
      send({ kind: 'waypoints', destination: address, threshold, waypoints }),
    [send],
  );

  /** Injeção de falha: derruba/religa o robô na rede (não é comando — é o "mundo físico"). */
  const setRobotOnline = useCallback(
    (address: string, online: boolean) => {
      runtimeRef.current?.world.getRobot(address)?.setOnline(online);
      rerender();
    },
    [rerender],
  );

  const setSwarmitEnabled = useCallback(
    (on: boolean) => {
      swarmitRef.current = on;
      setSwarmitEnabledState(on);
      runtimeRef.current?.gateway.setSwarmitEnabled(on);
      rerender();
    },
    [rerender],
  );

  const swarmitCommand = useCallback(
    (address: string, action: 'start' | 'stop' | 'reset') => {
      const rt = runtimeRef.current;
      if (!rt) return;
      if (action === 'start') send({ kind: 'swarmit', destination: address, payload: { type: SwarmitPayloadType.SWARMIT_START } });
      else if (action === 'stop') send({ kind: 'swarmit', destination: address, payload: { type: SwarmitPayloadType.SWARMIT_STOP } });
      else {
        const robot = rt.world.getRobot(address);
        send({
          kind: 'swarmit',
          destination: address,
          payload: { type: SwarmitPayloadType.SWARMIT_RESET, pos_x: Math.round(robot?.pos_x ?? 0), pos_y: Math.round(robot?.pos_y ?? 0) },
        });
      }
    },
    [send],
  );

  const swarmitFlash = useCallback(
    (address: string) => {
      runtimeRef.current?.link.flash(address);
      rerender();
    },
    [rerender],
  );

  /** START em cada robô, um por vez com o address — nunca em broadcast (ver memória "rede Mari": broadcast derruba robô sem imagem). */
  const swarmitStartAll = useCallback(() => {
    for (const r of runtimeRef.current?.world.robots ?? []) swarmitCommand(r.address, 'start');
  }, [swarmitCommand]);

  const exportState = useCallback(() => {
    const rt = runtimeRef.current;
    if (rt) downloadJson(`${scenarioName || 'cenario'}-estado.json`, ScenarioMapper.fromWorld(rt.world));
  }, [scenarioName]);

  const exportDraft = useCallback(() => {
    if (draft) downloadJson(`${scenarioName || 'cenario'}.json`, draft);
  }, [draft, scenarioName]);

  // ---- snapshot pra render ------------------------------------------------------

  const rt = mode === 'sim' ? runtimeRef.current : null;
  const world = rt?.world ?? null;
  const robots: SimRobotModel[] = world ? world.robots.map((r) => r.snapshot()) : [];
  const backend = new Map<string, { view: BackendRobotView | null; status: RobotStatus | null }>();
  const swarmit = new Map<string, SwarmitDeviceView | null>();
  if (rt) {
    for (const r of robots) {
      backend.set(r.address, { view: rt.link.getView(r.address), status: rt.link.statusOf(r.address) });
      swarmit.set(r.address, rt.gateway.swarmitView(r.address));
    }
  }

  const netStats: { uplink: NetChannelStats; downlink: NetChannelStats } | null = rt ? rt.gateway.netStats : null;
  const logEntries: readonly LinkLogEntry[] = rt ? rt.link.entries : [];
  const netConfig = world ? netConfigOf(world.sim) : draft ? netConfigOf(draft.sim) : null;

  return {
    draft,
    scenarioName,
    setScenarioName,
    mode,
    playing,
    time: world?.time ?? 0,
    tickHz: world?.sim.tick_hz ?? draft?.sim.tick_hz ?? 0,
    world,
    robots,
    trails: trailsRef.current as ReadonlyMap<string, readonly Vec2Model[]>,
    backend,
    swarmit,
    swarmitEnabled,
    netConfig,
    netStats,
    received: rt?.link.received ?? null,
    logEntries,
    load,
    enterSim,
    enterEdit,
    reset,
    play: useCallback(() => setPlaying(true), []),
    pause: useCallback(() => setPlaying(false), []),
    updateDraft,
    setNetConfig,
    setSimParams,
    moveRaw,
    setControlMode,
    setRgb,
    sendWaypoints,
    setRobotOnline,
    setSwarmitEnabled,
    swarmitCommand,
    swarmitFlash,
    swarmitStartAll,
    exportState,
    exportDraft,
  };
}

export type SimulationController = ReturnType<typeof useSimulation>;

function recordTrails(trails: Map<string, Vec2Model[]>, world: SimWorld): void {
  for (const r of world.robots) {
    let trail = trails.get(r.address);
    if (!trail) {
      trail = [];
      trails.set(r.address, trail);
    }
    const last = trail[trail.length - 1];
    if (!last || Math.hypot(r.pos_x - last.x, r.pos_y - last.y) >= TRAIL_MIN_DIST_MM) {
      trail.push({ x: r.pos_x, y: r.pos_y });
      if (trail.length > TRAIL_MAX_POINTS) trail.splice(0, trail.length - TRAIL_MAX_POINTS);
    }
  }
}

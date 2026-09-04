import { useCallback, useEffect, useRef, useState } from 'react';
import { ControlModeType, PayloadType } from '../../protocol/enums';
import { decodeControlMode, decodeMoveRaw, decodeWaypoints } from '../../protocol/payloads';
import { World } from '../../core/World';
import { DEFAULT_SCENARIO, exportScenario, importScenario } from '../../core/scenario';
import type { Arena, Obstacle, Scenario, SimRobotState } from '../../core/types';
import { MqttFleetLink } from '../../link/MqttFleetLink';
import type { FleetLink } from '../../link/FleetLink';

const TICK_HZ = 30;
const TELEMETRY_HZ = 10;

function readNetworkId(): number {
  const raw = import.meta.env.VITE_MARI_NETWORK_ID;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0x1200;
}

function readBrokerUrl(): string {
  return import.meta.env.VITE_MQTT_WS_URL || 'ws://localhost:9001';
}

// Orquestra o núcleo (World) + o transporte (FleetLink) + o estado React da
// tela de Simulação. O World e o FleetLink não sabem nada de React; este
// hook é a única ponte entre eles e a UI.
export function useSimulation() {
  // O World é instanciado uma única vez e reaproveitado pelo ciclo de vida
  // do componente — `getWorld()` garante isso sem exigir checagem de nulo
  // em todo ponto de uso.
  const worldRef = useRef<World | null>(null);
  const getWorld = useCallback((): World => {
    if (!worldRef.current) worldRef.current = new World();
    return worldRef.current;
  }, []);

  const linkRef = useRef<FleetLink | null>(null);

  const [robots, setRobots] = useState<SimRobotState[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [arena, setArena] = useState<Arena>(DEFAULT_SCENARIO.arena);
  const [scenarioName, setScenarioName] = useState(DEFAULT_SCENARIO.name);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTicks, setElapsedTicks] = useState(0);

  // Carrega o cenário inicial e liga o loop de física ao montar.
  useEffect(() => {
    const world = getWorld();
    world.loadScenario(DEFAULT_SCENARIO);
    setObstacles(world.getObstacles());

    const unsubscribe = world.subscribe((snapshot) => {
      setRobots(snapshot);
      setElapsedTicks((t) => t + 1);
    });
    world.start(TICK_HZ);

    return () => {
      unsubscribe();
      world.stop();
      linkRef.current?.disconnect();
    };
  }, [getWorld]);

  // Publica telemetria periodicamente enquanto conectado.
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      linkRef.current?.publishTelemetry(
        getWorld()
          .getRobots()
          .map((r) => ({ address: r.address, theta: r.theta, posX: r.posX, posY: r.posY })),
      );
    }, 1000 / TELEMETRY_HZ);
    return () => clearInterval(interval);
  }, [connected, getWorld]);

  const handleCommand = useCallback(
    (address: string, payloadType: number, body: Uint8Array) => {
      const world = getWorld();
      switch (payloadType) {
        case PayloadType.CMD_MOVE_RAW: {
          const move = decodeMoveRaw(body);
          world.applyMoveRaw(address, move.leftY, move.rightY);
          break;
        }
        case PayloadType.CONTROL_MODE: {
          const mode = decodeControlMode(body);
          world.applyControlMode(
            address,
            mode as (typeof ControlModeType)[keyof typeof ControlModeType],
          );
          break;
        }
        case PayloadType.LH2_WAYPOINTS: {
          const waypoints = decodeWaypoints(body);
          world.applyWaypoints(address, waypoints.points);
          break;
        }
        default:
          // CMD_RGB_LED e outros: sem efeito visual nesta primeira versão.
          break;
      }
    },
    [getWorld],
  );

  const connect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const link = new MqttFleetLink({ url: readBrokerUrl(), networkId: readNetworkId() });
      link.onCommand(handleCommand);
      await link.connect();
      linkRef.current = link;
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao conectar no broker MQTT.');
    } finally {
      setConnecting(false);
    }
  }, [handleCommand]);

  const disconnect = useCallback(() => {
    linkRef.current?.disconnect();
    linkRef.current = null;
    setConnected(false);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((prev) => {
      getWorld().setPaused(!prev);
      return !prev;
    });
  }, [getWorld]);

  const reset = useCallback(
    (scenario: Scenario = DEFAULT_SCENARIO) => {
      const world = getWorld();
      world.loadScenario(scenario);
      setObstacles(world.getObstacles());
      setArena(scenario.arena);
      setScenarioName(scenario.name);
      setPaused(false);
      world.setPaused(false);
    },
    [getWorld],
  );

  const dropRobot = useCallback((address: string) => getWorld().dropRobot(address), [getWorld]);
  const reconnectRobot = useCallback(
    (address: string) => getWorld().reconnectRobot(address),
    [getWorld],
  );

  const exportCurrentScenario = useCallback((): string => {
    const world = getWorld();
    return exportScenario({
      version: 1,
      name: scenarioName,
      arena,
      obstacles: world.getObstacles(),
      robots: world.getRobots().map((r) => ({
        address: r.address,
        label: r.label,
        x: r.posX,
        y: r.posY,
        theta: r.theta,
        battery: r.battery,
      })),
    });
  }, [scenarioName, arena, getWorld]);

  const importScenarioFromJson = useCallback(
    (json: string) => {
      try {
        reset(importScenario(json));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível importar o cenário.');
      }
    },
    [reset],
  );

  return {
    robots,
    obstacles,
    arena,
    scenarioName,
    connected,
    connecting,
    paused,
    error,
    elapsedSeconds: elapsedTicks / TICK_HZ,
    tickHz: TICK_HZ,
    connect,
    disconnect,
    togglePause,
    reset,
    dropRobot,
    reconnectRobot,
    exportScenario: exportCurrentScenario,
    importScenario: importScenarioFromJson,
  };
}

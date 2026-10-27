// Contrato de transporte do gateway simulado — porte do RobotSwarmSimulator
// (src/link/FleetLink.ts), que espelha o `dotbot/adapter.py` do PyDotBot e a
// decisão A do SIMULADOR_PLANO.md (seção 4): o runtime do gateway
// (screens/Simulation/SimGateway.ts) só conversa com o mundo externo por aqui, em tipos
// NEUTROS — comandos já decodificados descendo, uplinks ainda não
// enquadrados subindo. Quem conhece bytes/tópicos/base64 é a implementação:
//   - LocalFleetLink (padrão, OFFLINE): "backend de bolso" em memória — a
//     própria tela faz o papel da API enquanto ela não existe;
//   - MqttFleetLink: a borda MQTT real (/mari/{NETID}/to_edge|to_cloud),
//     pronta pra quando o backend estiver no ar (não ligada na UI ainda).

import type { DotBotControlMode } from '../enums/DotBotControlMode.enum';
import type { Vec2Model } from '../model/SimWorld.Model';
import type { DotBotAdvertisement } from './Protocols/DotBot.Payload';
import type { SwarmitPayload } from './Protocols/Swarmit/Swarmit.Protocol';
import { swarmitPayloadName } from './Protocols/Swarmit/Swarmit.Protocol';

// ---- Comandos que DESCEM (cloud → gateway → robô) --------------------------
// `destination` = address em 16 hex (ou BROADCAST_ADDRESS, ver SimulationConsts).

export interface MoveRawCommand {
  kind: 'move-raw';
  destination: string;
  left_x: number;
  left_y: number;
  right_x: number;
  right_y: number;
}

export interface RgbCommand {
  kind: 'rgb';
  destination: string;
  red: number;
  green: number;
  blue: number;
}

export interface ControlModeCommand {
  kind: 'control-mode';
  destination: string;
  mode: DotBotControlMode;
}

/** LH2_WAYPOINTS — rota (entra em AUTO). Posições em mm. */
export interface WaypointsCommand {
  kind: 'waypoints';
  destination: string;
  threshold: number;
  waypoints: Vec2Model[];
}

/** Comando swarmit (next_proto = SWARMIT_TESTBED). */
export interface SwarmitCommand {
  kind: 'swarmit';
  destination: string;
  payload: SwarmitPayload;
}

export type FleetCommand = MoveRawCommand | RgbCommand | ControlModeCommand | WaypointsCommand | SwarmitCommand;

// ---- Uplinks que SOBEM (gateway → cloud) ------------------------------------

export interface GatewayInfoUplink {
  kind: 'gateway-info';
  /** Nº do slot TSCH — sem rádio real, derivado do relógio simulado. */
  asn: bigint;
  /** Uptime do gateway em ms. */
  timer: number;
}

export interface NodeLifecycleUplink {
  kind: 'node-joined' | 'node-left' | 'node-keep-alive';
  address: string;
}

/** NODE_DATA com DOTBOT_ADVERTISEMENT (next_proto = DOTBOT_APP). */
export interface NodeDataUplink {
  kind: 'node-data';
  source: string;
  payload: DotBotAdvertisement;
}

/** NODE_DATA com payload swarmit (acks, heartbeat de status). */
export interface SwarmitDataUplink {
  kind: 'swarmit-data';
  source: string;
  payload: SwarmitPayload;
}

export type FleetUplink = GatewayInfoUplink | NodeLifecycleUplink | NodeDataUplink | SwarmitDataUplink;

export interface FleetLink {
  /** Conecta/assina. Resolve quando o link está pronto pra trafegar. */
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Registra o callback de comandos descendo (já decodificados). */
  onCommand(cb: (cmd: FleetCommand) => void): void;
  /** Publica um evento subindo (a implementação enquadra e envia). */
  publishUplink(uplink: FleetUplink): void;
}

/** Rótulo curto de um comando pro log ("move-raw 80/80", "waypoints ×4"...). */
export function describeCommand(cmd: FleetCommand): string {
  switch (cmd.kind) {
    case 'move-raw':
      return `CMD_MOVE_RAW L=${cmd.left_y} R=${cmd.right_y}`;
    case 'rgb':
      return `CMD_RGB_LED (${cmd.red}, ${cmd.green}, ${cmd.blue})`;
    case 'control-mode':
      return `CONTROL_MODE ${cmd.mode === 1 ? 'AUTO' : 'MANUAL'}`;
    case 'waypoints':
      return `LH2_WAYPOINTS ×${cmd.waypoints.length} (thr ${cmd.threshold} mm)`;
    case 'swarmit':
      return swarmitPayloadName(cmd.payload.type);
  }
}

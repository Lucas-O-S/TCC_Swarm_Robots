import type { NetworkConfigModel, SimConfigModel } from '../model/Scenario.Model';
import { BLOCK_SIDE_M } from './MapConsts';

// ---- Mapa (ponte mm ↔ grid do app) -----------------------------------------

/** Lado de uma célula do grid, em mm — o mesmo bloco da legenda do <MapCanvas> (0,2 m). */
export const CELL_MM = Math.round(BLOCK_SIDE_M * 1000);

/** Encaixe ao desenhar/arrastar: barreiras a cada meia célula, pontos (robô, waypoint) a cada 50 mm. */
export const OBSTACLE_SNAP_MM = CELL_MM / 2;
export const POINT_SNAP_MM = 50;

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

// ---- Robô (cinemática simples de tração diferencial do RobotSwarmSimulator) ----

/** CMD_MOVE_RAW usa int8. */
export const PWM_MAX = 127;
/** pwm ±127 → ±500 mm/s. */
export const MAX_WHEEL_SPEED_MM_S = 500;
/** Distância entre rodas. */
export const WHEEL_BASE_MM = 45;
/** Raio usado na colisão. */
export const ROBOT_RADIUS_MM = 35;
/** Raio de chegada quando o cenário tem waypoints mas não define `waypoint_threshold_mm`. */
export const DEFAULT_WAYPOINT_THRESHOLD_MM = 50;

/** Address do robô: 16 dígitos hex (mesmo VARCHAR(16) do backend). */
export const ADDRESS_RE = /^[0-9A-F]{16}$/i;
/** Destination de broadcast. */
export const BROADCAST_ADDRESS = 'FFFFFFFFFFFFFFFF';

// ---- Backend (timers de envelhecimento — src/enums/RobotStatus.enum.ts) -------

/** Sem DOTBOT_ADVERTISEMENT há mais que isso → Inactive. */
export const INACTIVE_AFTER_S = 5;
/** Sem DOTBOT_ADVERTISEMENT há mais que isso → Lost. */
export const LOST_AFTER_S = 60;

// ---- Padrões de cenário ---------------------------------------------------------

export const DEFAULT_SIM_CONFIG: SimConfigModel = {
  tick_hz: 50,
  advertise_hz: 2,
  battery_drain_per_min: 1.0,
  pdr_percent: 100,
  slot_latency_ms: 0,
};

/** network.id "1200" = MARI_NETWORK_ID=0x1200 no backend (AGENTS.md, "network_id TEM que bater"). */
export const DEFAULT_NETWORK: NetworkConfigModel = { id: '1200', gateway_addr: '0000000000000001' };

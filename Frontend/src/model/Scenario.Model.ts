/**
 * Cenário da tela de Simulação — o MESMO schema JSON do RobotSwarmSimulator
 * (README de lá, seção "O cenário"), então um .json exportado aqui abre lá e
 * vice-versa. É o estado INICIAL que o modo Editar mexe e que o modo Simular
 * carrega do zero (ver `Scenario.Mapper.ts` → `SimWorld`).
 *
 * Unidades: milímetros, com Y crescendo PRA CIMA a partir do canto
 * inferior-esquerdo (convenção do simulador e do mundo LH2); ângulos em graus.
 * O campo `mode` usa a numeração do FIO (`DotBotControlMode`: Manual = 0,
 * Auto = 1), não o `RobotControlMode` do backend.
 */

export interface ScenarioObstacleModel {
  id: string;
  x_mm: number;
  y_mm: number;
  w_mm: number;
  h_mm: number;
}

export interface ScenarioWaypointModel {
  x_mm: number;
  y_mm: number;
}

export interface ScenarioRobotModel {
  /** 16 dígitos hex (identidade do rádio — mesmo formato do `address` do backend). */
  address: string;
  /** `RobotApplication`. */
  application: number;
  /** `DotBotControlMode` (Manual = 0, Auto = 1). */
  mode: number;
  start: { x_mm: number; y_mm: number; theta_deg: number };
  battery: number;
  /** Rota do modo AUTO (opcional). Só é seguida com mode = Auto. */
  waypoints?: ScenarioWaypointModel[];
  /** Raio de chegada do waypoint, em mm (opcional; default 50). */
  waypoint_threshold_mm?: number;
  /** Rota em loop (opcional; default false = para no fim). */
  loop?: boolean;
  /** Cor do LED (opcional; só é salva quando ≠ 0,0,0). */
  rgb?: { r: number; g: number; b: number };
}

export interface NetworkConfigModel {
  /** network_id em 4 hex, ex.: "1200" — tem que bater com o MARI_NETWORK_ID do backend. */
  id: string;
  /** Address do gateway (16 hex). */
  gateway_addr: string;
}

export interface SimConfigModel {
  tick_hz: number;
  advertise_hz: number;
  /** % de bateria por minuto. */
  battery_drain_per_min: number;
  /** Packet delivery ratio, 0–100%: cada mensagem (uplink E downlink) é descartada com prob. 1 − pdr/100. */
  pdr_percent: number;
  /** Atraso de entrega por mensagem, em ms (latência de slot TSCH lógica, ~63–150 ms no Mari real). */
  slot_latency_ms: number;
  /** Kill-switch da degradação de rede (ausente = true). */
  net_enabled?: boolean;
  /** Jitter uniforme em [0, jitter_ms] somado à latência (ausente = 0). */
  jitter_ms?: number;
}

export interface ScenarioModel {
  version: number;
  network: NetworkConfigModel;
  arena: { width_mm: number; height_mm: number; grid_mm: number };
  obstacles: ScenarioObstacleModel[];
  robots: ScenarioRobotModel[];
  sim: SimConfigModel;
}

/**
 * Constantes do protocolo DotBot/Mari, espelhando `src/Protocols/` e
 * `src/Enums/` do backend (ver AGENTS.md — "Camada de protocolo, transporte
 * e comandos"). Mantidas como objetos `as const` (em vez de `enum` do TS)
 * porque também precisam ser lidas em tempo de execução ao decodificar
 * bytes vindos do backend, e um objeto simples deixa isso direto.
 */

// Subconjunto de PayloadType realmente usado pelo simulador: os 4 comandos
// que ele recebe do backend + o dado de pose que ele produz.
export const PayloadType = {
  CMD_MOVE_RAW: 0x00,
  CMD_RGB_LED: 0x01,
  ADVERTISEMENT: 0x04,
  DOTBOT_ADVERTISEMENT: 0x06,
  CONTROL_MODE: 0x07,
  LH2_WAYPOINTS: 0x08,
  DOTBOT_SIMULATOR_DATA: 0xfa,
} as const;

export const ApplicationType = {
  DotBot: 0,
  SailBot: 1,
  Freebot: 2,
  XGO: 3,
  LH2_mini_mote: 4,
} as const;

export const ControlModeType = { Auto: 0, Manual: 1, SemiAuto: 2 } as const;
export type ControlMode = (typeof ControlModeType)[keyof typeof ControlModeType];

// Diferente do restante deste arquivo, o backend real NUNCA recebe isso via
// rádio — ele calcula a partir de `lastSync`. Aqui no simulador usamos o
// mesmo enum só pra representar visualmente o estado de cada robô simulado.
export const RobotStatus = { Active: 0, Inactive: 1, Lost: 2 } as const;
export type RobotStatusValue = (typeof RobotStatus)[keyof typeof RobotStatus];

export const NextProto = { MARI_INTERNAL: 0x01, DOTBOT_APP: 0x11, UNKNOWN: 0xff } as const;

export const EdgeEvent = {
  NODE_JOINED: 1,
  NODE_LEFT: 2,
  NODE_DATA: 3,
  NODE_KEEP_ALIVE: 4,
  GATEWAY_INFO: 5,
} as const;

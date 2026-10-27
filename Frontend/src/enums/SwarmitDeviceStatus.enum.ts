/**
 * Espelha `src/Enums/SwarmitDeviceStatus.enum.ts` do backend (swarmit
 * testbed/protocol.py, StatusType + DeviceType).
 *
 * Bootloader NÃO é erro: é o estado de repouso — todo power-on cai aqui e
 * exige um SWARMIT_START. Um robô em Bootloader só emite SWARMIT_STATUS,
 * nada de DOTBOT_APP, e por isso fica invisível para o backend.
 *
 * Objetos `as const` em vez de `enum` — ver nota em `RobotStatus.enum.ts`.
 */
export const SwarmitDeviceStatus = {
  Bootloader: 0,
  Running: 1,
  Stopping: 2,
  Resetting: 3,
  Programming: 4,
} as const;

export type SwarmitDeviceStatus = (typeof SwarmitDeviceStatus)[keyof typeof SwarmitDeviceStatus];

export const SwarmitDeviceType = {
  Unknown: 0,
  DotBotV3: 1,
  DotBotV2: 2,
  nRF5340DK: 3,
  nRF52840DK: 4,
} as const;

export type SwarmitDeviceType = (typeof SwarmitDeviceType)[keyof typeof SwarmitDeviceType];

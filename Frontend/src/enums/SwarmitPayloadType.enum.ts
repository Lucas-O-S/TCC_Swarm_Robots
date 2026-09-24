/**
 * Espelha `src/Enums/SwarmitPayloadType.enum.ts` do backend (swarmit
 * testbed/protocol.py) + os tipos do fluxo de OTA (0x84–0x87), que o backend
 * ainda não usa mas o respondedor do simulador implementa.
 *
 * PROPOSITALMENTE separado do `PayloadType` do DotBot: são dois protocolos,
 * multiplexados pelo nextProto do header Mari (SWARMIT_TESTBED × DOTBOT_APP).
 * Objeto `as const` em vez de `enum` — ver nota em `RobotStatus.enum.ts`.
 */
export const SwarmitPayloadType = {
  SWARMIT_STATUS: 0x80,
  SWARMIT_START: 0x81,
  SWARMIT_STOP: 0x82,
  SWARMIT_RESET: 0x83,
  SWARMIT_OTA_START: 0x84,
  SWARMIT_OTA_CHUNK: 0x85,
  SWARMIT_OTA_START_ACK: 0x86,
  SWARMIT_OTA_CHUNK_ACK: 0x87,
} as const;

export type SwarmitPayloadType = (typeof SwarmitPayloadType)[keyof typeof SwarmitPayloadType];

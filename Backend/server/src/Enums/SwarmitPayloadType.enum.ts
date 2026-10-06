
// Tipos de payload do protocolo SwarmIT (o testbed), espelhando
// swarmit/testbed/protocol.py da release 0.9.0.
//
// PROPOSITALMENTE separado do PayloadType do DotBot: são dois protocolos
// diferentes, multiplexados pelo campo nextProto do header Mari
// (NextProto.SWARMIT_TESTBED = 0x10 aqui, DOTBOT_APP = 0x11 lá). Misturar os
// dois enums faria o isValidPayloadType() aceitar frames que o SwarmService
// não sabe ler.
export enum SwarmitPayloadType {
    // robô -> host, a ~1 Hz
    SWARMIT_STATUS = 0x80,
    // host -> robô
    SWARMIT_START = 0x81,
    SWARMIT_STOP = 0x82,
    SWARMIT_RESET = 0x83,
    // consulta genérica: manda o msg_id da resposta que se quer
    SWARMIT_REQUEST_MESSAGE = 0x8E,
    // robô -> host, resposta do REQUEST_MESSAGE
    SWARMIT_DEVICE_INFO_RESP = 0x8F,
}

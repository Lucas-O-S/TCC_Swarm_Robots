
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
    // robô -> host, log de evento (timestamp + len + dados). Também carrega a
    // captura LH2 bruta, marcada pela tag LH2_CALIB_TAG no 1º byte dos dados.
    SWARMIT_EVENT_LOG = 0x89,
    // host -> robô, homografia de uma estação LH2
    SWARMIT_LH2_CALIBRATION = 0xA1,
    // host -> robô, pede uma captura LH2 bruta (só em Bootloader). Sem corpo.
    SWARMIT_LH2_CAPTURE = 0xA2,
}


// Multiplex de protocolo de camada superior no header Mari (espelha
// mr_next_proto_t do firmware; valores em marilib/mari_protocol.py 0.10.0).
// Faixas: 0x01-0x09 interno do Mari, 0x10-0x39 aplicações de enxame,
// 0xA0-0xFD protocolos de rede padronizados.
export enum NextProto { 
    MARI_INTERNAL = 0x01,
    SWARMIT_TESTBED = 0x10,  // protocolo do testbed: status, start/stop, OTA
    DOTBOT_APP = 0x11,  
    UNKNOWN = 0xff,
}

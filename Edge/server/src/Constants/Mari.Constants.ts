// Header Mari v3 (igual ao marilib): version(1) type(1) network_id(2)
// destination(8) source(8) next_proto(1) = 21 B.
export const MARI_VERSION = 3;

export const MARI_TYPE_DATA = 16;

export const MARI_HEADER_LEN = 21;

// Rede padrão quando MARI_NETWORK_ID não vem no .env (serial e MQTT usam a mesma).
export const MARI_DEFAULT_NETWORK_ID = 0x0001;

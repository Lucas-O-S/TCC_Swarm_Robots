// Endereço de rádio: 8 bytes little-endian no fio, 16 hex em texto.
export const ADDRESS_HEX_LEN = 16;

// Endereço zerado = o host/gateway. Vai no `source` de todo frame que sai e no
// `destination` dos frames que o simulador fake entrega à borda.
export const HOST_ADDRESS = "0".repeat(ADDRESS_HEX_LEN);

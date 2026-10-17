// Uma homografia por estação: 9 × int32 LE (valor × 1000, row-major).
export const LH2_MATRIX_LEN = 36;

// Máximo de estações que o swarmit aceita na calibração.
export const LH2_MAX_STATIONS = 16;

// DB_MAX_WAYPOINTS no DotBot-firmware 1.23.0: o excedente é cortado em
// silêncio e o waypoint_idx nunca chega ao total.
export const LH2_MAX_WAYPOINTS = 16;

// pos_x/pos_y = 0xFFFFFFFF no advertisement = "sem leitura de posição".
export const LH2_NO_POSITION = 0xFFFFFFFF;

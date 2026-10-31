// Uma homografia por estação: 9 × int32 LE (valor × 1000, row-major).
export const LH2_MATRIX_LEN = 36;

// Máximo de estações que o swarmit aceita na calibração.
export const LH2_MAX_STATIONS = 16;

// DB_MAX_WAYPOINTS no DotBot-firmware 1.23.0: o excedente é cortado em
// silêncio e o waypoint_idx nunca chega ao total.
export const LH2_MAX_WAYPOINTS = 16;

// pos_x/pos_y = 0xFFFFFFFF no advertisement = "sem leitura de posição".
export const LH2_NO_POSITION = 0xFFFFFFFF;

// direction sem heading: -1000 é o DB_DIRECTION_INVALID do firmware 1.23.0;
// o legado mandava 0xFFFF, que vira -1 no decode com sinal.
export const LH2_DIRECTION_INVALID = -1000;

export const LH2_DIRECTION_INVALID_LEGACY = -1;

// Captura LH2 bruta (swarmit 0.9.0, testbed/protocol.py): o robô responde o
// SWARMIT_LH2_CAPTURE com um SWARMIT_EVENT_LOG cujos dados começam com esta
// tag (SWRMT_LH2_CALIB_TAG no bootloader), seguida de amostras de 9 B:
// lh_index (u8) + count1 (u32 LE) + count2 (u32 LE).
export const LH2_CALIB_TAG = 0xCA;

export const LH2_SAMPLE_LEN = 9;

// Período de varredura de cada canal da base station 2.0 (canal 1 = índice 0),
// em ticks - LH_PERIODS do PyDotBot 0.30.0 (dotbot/calibration/lighthouse2.py).
export const LH2_PERIODS = [
    959000, 957000, 953000, 949000, 947000, 943000, 941000, 939000,
    937000, 929000, 919000, 911000, 907000, 901900, 893000, 887000,
];

// Lado do quadrado marcado no chão, em mm (CALIBRATION_DISTANCE_DEFAULT).
export const LH2_CALIBRATION_DISTANCE_DEFAULT = 500;

// Cantos do quadrado como fração da arena (REFERENCE_POINTS_DEFAULT). A arena
// é 5 × o lado, então com 500 mm os cantos ficam em 1000..1500 mm.
export const LH2_ARENA_FACTOR = 5;

// Captura: espera por tentativa e reenvios (CAPTURE_TIMEOUT_DEFAULT = 5 s,
// CAPTURE_RETRIES_DEFAULT = 3 no PyDotBot). O pedido não tem ack no enlace.
export const LH2_CAPTURE_TIMEOUT_MS = 5000;

export const LH2_CAPTURE_RETRIES = 3;

// Respostas que cada canto junta antes de fechar. O bootloader (swarmit 0.9.0,
// main.c) responde assim que a primeira base fica pronta e manda só as que
// estiverem prontas naquele instante: uma resposta pode vir sem alguma base.
export const LH2_CAPTURE_MIN_RESPONSES = 2;

// Tolerância da conferência da homografia: os 4 cantos projetados têm que cair
// nos de referência (np.allclose(..., atol=1e-3) no PyDotBot).
export const LH2_HOMOGRAPHY_TOLERANCE = 1e-3;

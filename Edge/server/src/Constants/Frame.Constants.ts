// Frame interno de 18 B (header do PyDotBot): é o que os adapters entregam ao
// SwarmService, seja qual for o transporte. No fio real quem vai é o Mari frame
// (ver Mari.Constants.ts).
export const FRAME_VERSION = 1;

// PacketType.DATA do PyDotBot.
export const FRAME_TYPE_DATA = 16;

export const FRAME_HEADER_LEN = 18;

export const FRAME_DESTINATION_OFFSET = 2;

export const FRAME_SOURCE_OFFSET = 10;

// Header + byte do payloadType. Menos que isso não é frame.
export const FRAME_MIN_LEN = FRAME_HEADER_LEN + 1;

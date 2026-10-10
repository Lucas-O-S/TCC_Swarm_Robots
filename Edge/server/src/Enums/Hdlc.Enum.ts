

export enum HdlcEnum {
  FLAG = 0x7e,
  FLAG_ESCAPED = 0x5e,
  ESCAPE = 0x7d,
  ESCAPE_ESCAPED = 0x5d,
  FCS_INIT = 0xffff,
  FCS_OK = 0xf0b8
}
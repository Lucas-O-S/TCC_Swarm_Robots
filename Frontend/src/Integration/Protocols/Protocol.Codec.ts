/**
 * Motor de encode/decode de campos little-endian, espelhando o
 * `PayloadCodec` do backend (`src/Protocols/Protocol.Codec.ts` — "É o mesmo
 * motor pros dois sentidos", ver AGENTS.md). Cada payload do protocolo é só
 * uma lista de campos (nome + tamanho em bytes + se é assinado); a mesma
 * lista serve pra montar (encode) e pra desmontar (decode) os bytes.
 */

export interface FieldSpec {
  name: string;
  length: 1 | 2 | 4;
  signed?: boolean;
}

export function encodeFields(fields: FieldSpec[], values: Record<string, number>): Uint8Array {
  const bytes: number[] = [];

  for (const field of fields) {
    const bits = field.length * 8;
    let value = Math.trunc(values[field.name] ?? 0);
    if (field.signed && value < 0) value += 2 ** bits;

    for (let i = 0; i < field.length; i++) {
      bytes.push(value & 0xff);
      value = Math.floor(value / 256);
    }
  }

  return Uint8Array.from(bytes);
}

export function decodeFields(
  fields: FieldSpec[],
  buffer: Uint8Array,
  offset = 0,
): Record<string, number> {
  const result: Record<string, number> = {};
  let pos = offset;

  for (const field of fields) {
    let value = 0;
    for (let i = field.length - 1; i >= 0; i--) {
      value = value * 256 + buffer[pos + i];
    }
    if (field.signed) {
      const max = 2 ** (field.length * 8);
      if (value >= max / 2) value -= max;
    }
    result[field.name] = value;
    pos += field.length;
  }

  return result;
}

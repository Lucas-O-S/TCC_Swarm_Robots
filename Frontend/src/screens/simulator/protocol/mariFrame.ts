/**
 * Frame do protocolo Mari (rede do gateway real) — mesma estrutura descrita
 * em AGENTS.md, seção "Rede Mari": header de 21 bytes (version, type,
 * network_id, destination, source, next_proto) envolvendo o pacote
 * DotBot (payloadType + body). O simulador fala essa mesma linguagem sobre
 * MQTT em vez de HDLC/serial (ver MqttFleetLink e a seção "Conexão com o
 * RobotSwarmSimulator").
 *
 * `destination`/`source` são endereços de 8 bytes — grandes demais pra um
 * `number` do JS sem perder precisão, por isso usam BigInt aqui, separado do
 * motor de campos genérico (`codec.ts`) usado pelos payloads menores.
 */

const HEADER_LENGTH = 21;

export interface MariHeader {
  version: number;
  type: number;
  networkId: number;
  destination: string; // hex, 16 caracteres
  source: string; // hex, 16 caracteres
  nextProto: number;
}

export interface MariFrame {
  header: MariHeader;
  payload: Uint8Array;
}

function addressToBytes(address: string): Uint8Array {
  const value = BigInt(`0x${address.padStart(16, '0')}`);
  const bytes = new Uint8Array(8);
  let remaining = value;
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return bytes;
}

function bytesToAddress(bytes: Uint8Array, offset: number): string {
  let value = 0n;
  for (let i = 7; i >= 0; i--) {
    value = (value << 8n) | BigInt(bytes[offset + i]);
  }
  return value.toString(16).padStart(16, '0');
}

export function buildMariHeader(header: MariHeader): Uint8Array {
  const bytes = new Uint8Array(HEADER_LENGTH);
  bytes[0] = header.version & 0xff;
  bytes[1] = header.type & 0xff;
  bytes[2] = header.networkId & 0xff;
  bytes[3] = (header.networkId >> 8) & 0xff;
  bytes.set(addressToBytes(header.destination), 4);
  bytes.set(addressToBytes(header.source), 12);
  bytes[20] = header.nextProto & 0xff;
  return bytes;
}

export function parseMariHeader(bytes: Uint8Array): MariHeader {
  return {
    version: bytes[0],
    type: bytes[1],
    networkId: bytes[2] | (bytes[3] << 8),
    destination: bytesToAddress(bytes, 4),
    source: bytesToAddress(bytes, 12),
    nextProto: bytes[20],
  };
}

export function buildMariFrame(header: MariHeader, payload: Uint8Array): Uint8Array {
  const headerBytes = buildMariHeader(header);
  const frame = new Uint8Array(headerBytes.length + payload.length);
  frame.set(headerBytes, 0);
  frame.set(payload, headerBytes.length);
  return frame;
}

export function parseMariFrame(bytes: Uint8Array): MariFrame {
  return {
    header: parseMariHeader(bytes.subarray(0, HEADER_LENGTH)),
    payload: bytes.subarray(HEADER_LENGTH),
  };
}

// Prefixo de 1 byte (EdgeEvent) que envolve o frame Mari inteiro — mesmo
// formato usado nos tópicos MQTT `to_edge`/`to_cloud`.
export function wrapEdgeEvent(event: number, frame: Uint8Array): Uint8Array {
  const wire = new Uint8Array(frame.length + 1);
  wire[0] = event;
  wire.set(frame, 1);
  return wire;
}

export function unwrapEdgeEvent(bytes: Uint8Array): { event: number; frame: Uint8Array } {
  return { event: bytes[0], frame: bytes.subarray(1) };
}

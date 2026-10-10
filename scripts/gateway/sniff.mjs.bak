#!/usr/bin/env node
// Sniffer da serial do gateway Mari — valida o gateway ISOLADO, antes de subir o Nest.
//
// Reproduz a mesma pilha do backend (HdlcHandler -> EdgeEvent -> Mari header 21B ->
// payload_type), mas em um processo só de leitura. Serve para responder duas
// perguntas antes de qualquer debug de backend:
//   1) o gateway está falando HDLC a 1 Mbaud?  -> aparecem frames
//   2) o robô entrou na rede com o network_id certo? -> aparecem NODE_JOINED / NODE_DATA
//
// Uso (a partir da raiz do repo):
//   node scripts/gateway/sniff.mjs                        # usa MARI_PORT ou /dev/ttyACM0
//   node scripts/gateway/sniff.mjs /dev/tty.usbmodem1103  # porta explícita (macOS)
//   RAW=1 node scripts/gateway/sniff.mjs                  # imprime também o hex cru
//
// ATENÇÃO: só um processo pode abrir a porta. Derrube o backend em GATEWAY_MODE=mari
// antes de rodar isto (e vice-versa).

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, "../../Backend/server");

let SerialPort;
try {
  const requireFromServer = createRequire(path.join(serverDir, "package.json"));
  ({ SerialPort } = requireFromServer("serialport"));
} catch (e) {
  console.error("Não achei o módulo 'serialport'.");
  console.error("Rode 'npm install' em Backend/server primeiro.");
  console.error(String(e?.message ?? e));
  process.exit(1);
}

const PORT = process.argv[2] ?? process.env.MARI_PORT ?? "/dev/ttyACM0";
const BAUD = Number(process.env.MARI_BAUDRATE ?? 1000000);
const RAW = process.env.RAW === "1";

// --- HDLC (mesmas constantes de src/Enums/Hdlc.Enum.ts) ---
const FLAG = 0x7e, FLAG_ESCAPED = 0x5e, ESCAPE = 0x7d, ESCAPE_ESCAPED = 0x5d;
const FCS_INIT = 0xffff, FCS_OK = 0xf0b8;

// Tabela FCS-16 do PPP (mesma de Fcs16Table.ts), gerada em runtime.
const FCS_TABLE = (() => {
  const t = new Uint16Array(256);
  for (let b = 0; b < 256; b++) {
    let crc = b;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >> 1) ^ 0x8408 : crc >> 1;
    t[b] = crc;
  }
  return t;
})();
const fcsUpdate = (fcs, byte) => (fcs >> 8) ^ FCS_TABLE[(fcs ^ byte) & 0xff];

const EDGE_EVENT = {
  1: "NODE_JOINED", 2: "NODE_LEFT", 3: "NODE_DATA",
  4: "NODE_KEEP_ALIVE", 5: "GATEWAY_INFO", 255: "UNKNOWN",
};
const NEXT_PROTO = { 0x01: "MARI_INTERNAL", 0x10: "SWARMIT_STATUS", 0x11: "DOTBOT_APP" };
const PAYLOAD_TYPE = {
  0x00: "CMD_MOVE_RAW", 0x01: "CMD_RGB_LED", 0x04: "ADVERTISEMENT",
  0x05: "GPS_POSITION", 0x06: "DOTBOT_ADVERTISEMENT", 0x07: "CONTROL_MODE",
  0x08: "LH2_WAYPOINTS", 0x09: "GPS_WAYPOINTS", 0x0a: "SAILBOT_DATA",
  0x0b: "CMD_XGO_ACTION", 0x0c: "LH2_PROCESSED_DATA",
  0x0e: "LH2_CALIBRATION_HOMOGRAPHY", 0x10: "RAW_DATA", 0xfa: "DOTBOT_SIMULATOR_DATA",
};

const stats = { bytes: 0, frames: 0, bad: 0, junk: 0, events: new Map(), nets: new Set(), nodes: new Set() };
const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
const ts = () => new Date().toISOString().slice(11, 23);

// --- state machine (espelha HdlcHandler) ---
let out = [], fcs = FCS_INIT, escape = false, receiving = false;

function pushBytes(chunk) {
  stats.bytes += chunk.length;
  for (const byte of chunk) {
    if (!receiving) {
      if (byte === FLAG) { out = []; fcs = FCS_INIT; escape = false; receiving = true; }
      continue;
    }
    if (byte === FLAG) {
      if (out.length > 0) {
        receiving = false;
        if (out.length >= 3 && fcs === FCS_OK) { stats.frames++; onFrame(Buffer.from(out.slice(0, -2))); }
        else if (out.length >= 3) stats.bad++;
        else stats.junk++;
        // uma FLAG fecha um frame e abre o próximo
        out = []; fcs = FCS_INIT; escape = false; receiving = true;
      }
      continue;
    }
    let emit;
    if (escape) {
      escape = false;
      if (byte === FLAG_ESCAPED) emit = FLAG;
      else if (byte === ESCAPE_ESCAPED) emit = ESCAPE;
      else emit = byte;
    } else if (byte === ESCAPE) escape = true;
    else emit = byte;
    if (emit !== undefined) { out.push(emit); fcs = fcsUpdate(fcs, emit); }
  }
}

function onFrame(payload) {
  if (RAW) console.log(`${ts()}  raw  ${payload.toString("hex")}`);
  if (payload.length < 1) return;

  const event = payload[0];
  const name = EDGE_EVENT[event] ?? `0x${event.toString(16)}`;
  bump(stats.events, name);

  const body = payload.subarray(1);
  if (body.length < 21) { console.log(`${ts()}  ${name.padEnd(15)} (sem header Mari, ${body.length}B)`); return; }

  const header = {
    version: body.readUInt8(0),
    type: body.readUInt8(1),
    networkId: body.readUInt16LE(2),
    destination: body.readBigUInt64LE(4).toString(16).padStart(16, "0"),
    source: body.readBigUInt64LE(12).toString(16).padStart(16, "0"),
    nextProto: body.readUInt8(20),
  };
  const mariPayload = body.subarray(21);

  stats.nets.add(header.networkId);
  if (header.source !== "0000000000000000") stats.nodes.add(header.source);

  const proto = NEXT_PROTO[header.nextProto] ?? `0x${header.nextProto.toString(16)}`;
  let tail = `net=0x${header.networkId.toString(16).padStart(4, "0")} src=${header.source} proto=${proto}`;

  if (header.nextProto === 0x11 && mariPayload.length > 0) {
    const pt = mariPayload[0];
    const ptName = PAYLOAD_TYPE[pt] ?? `0x${pt.toString(16)}`;
    tail += ` payload=${ptName} (${mariPayload.length - 1}B)`;
  } else if (mariPayload.length > 0) {
    tail += ` ${mariPayload.length}B`;
  }
  console.log(`${ts()}  ${name.padEnd(15)} ${tail}`);
}

// --- serial ---
console.log(`[sniff] abrindo ${PORT} @ ${BAUD} baud (ctrl+C para sair)`);
const port = new SerialPort({ path: PORT, baudRate: BAUD });

port.on("open", () => console.log("[sniff] porta aberta — aguardando frames HDLC..."));
port.on("data", (chunk) => pushBytes(chunk));
port.on("error", (e) => {
  console.error(`[sniff] erro na serial: ${e.message}`);
  if (/Permission denied|EACCES/i.test(e.message)) console.error("       no Linux: sudo usermod -aG dialout $USER (e relogar)");
  if (/Resource temporarily unavailable|busy|EBUSY/i.test(e.message)) console.error("       a porta já está aberta em outro processo (backend em GATEWAY_MODE=mari?)");
  process.exit(1);
});

const summary = setInterval(() => {
  const events = [...stats.events].map(([k, v]) => `${k}=${v}`).join(" ") || "nenhum";
  const nets = [...stats.nets].map((n) => `0x${n.toString(16).padStart(4, "0")}`).join(",") || "-";
  console.log(`--- ${stats.bytes}B lidos | ${stats.frames} frames ok | ${stats.bad} com FCS ruim | eventos: ${events} | networks: ${nets} | nós: ${stats.nodes.size}`);
}, 5000);

const bye = () => {
  clearInterval(summary);
  console.log("\n=== resumo ===");
  console.log(`bytes lidos       : ${stats.bytes}`);
  console.log(`frames HDLC ok    : ${stats.frames}`);
  console.log(`frames com FCS ruim: ${stats.bad}  (lixo entre flags: ${stats.junk})`);
  console.log(`eventos           : ${[...stats.events].map(([k, v]) => `${k}=${v}`).join(" ") || "nenhum"}`);
  console.log(`network ids vistos: ${[...stats.nets].map((n) => `0x${n.toString(16).padStart(4, "0")}`).join(", ") || "nenhum"}`);
  console.log(`nós vistos        : ${[...stats.nodes].join(", ") || "nenhum"}`);
  if (stats.bytes === 0) console.log("\nDIAGNÓSTICO: nada chegou. Porta errada, gateway não flashado ou cabo no conector de debug em vez do nRF USB.");
  else if (stats.frames === 0) console.log("\nDIAGNÓSTICO: chegaram bytes mas nenhum frame válido. Baudrate errado (tem que ser 1000000) ou app core sem o firmware do gateway.");
  else if (stats.nodes.size === 0) console.log("\nDIAGNÓSTICO: gateway OK, nenhum nó na rede. Robô desligado ou network_id diferente.");
  process.exit(0);
};
process.on("SIGINT", bye);
process.on("SIGTERM", bye);

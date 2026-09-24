import type { SimConfigModel } from '../../model/Scenario.Model';

// Fidelidade de rede (PDR + latência de slot) — porte do RobotSwarmSimulator
// (src/net/netmodel.ts).
//
// ABSTRAÇÃO LÓGICA, NÃO SIMULAÇÃO DE RÁDIO: o Mari real roda TSCH sobre BLE;
// aqui só se modela o EFEITO por mensagem — descartada com probabilidade
// (1 − pdr/100) ou entregue após slot_latency_ms + jitter uniforme. Tudo em
// TEMPO SIMULADO (segundos do World) e com RNG de seed fixa (determinístico).
// Com a degradação desligada, ou PDR=100% e atraso 0, a entrega é SÍNCRONA.

export type Rng = () => number;

/** mulberry32 — PRNG de 32 bits, determinístico por seed. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface NetParams {
  enabled: boolean;
  pdr_percent: number;
  slot_latency_ms: number;
  jitter_ms: number;
}

export function netParamsFromSim(sim: SimConfigModel): NetParams {
  return {
    enabled: sim.net_enabled ?? true,
    pdr_percent: sim.pdr_percent,
    slot_latency_ms: sim.slot_latency_ms,
    jitter_ms: sim.jitter_ms ?? 0,
  };
}

export function isPassthrough(p: NetParams): boolean {
  return !p.enabled || (p.pdr_percent >= 100 && p.slot_latency_ms <= 0 && p.jitter_ms <= 0);
}

export type NetDecision = { drop: true } | { drop: false; delay_s: number };

export function decideFate(params: NetParams, rng: Rng): NetDecision {
  if (isPassthrough(params)) return { drop: false, delay_s: 0 };
  const pdr = Math.min(100, Math.max(0, params.pdr_percent));
  if (pdr < 100 && rng() >= pdr / 100) return { drop: true };
  const baseMs = Math.max(0, params.slot_latency_ms);
  const jitterMs = params.jitter_ms > 0 ? rng() * params.jitter_ms : 0;
  return { drop: false, delay_s: (baseMs + jitterMs) / 1000 };
}

export interface NetChannelStats {
  sent: number;
  delivered: number;
  dropped: number;
  pending: number;
}

interface Queued<T> {
  deliverAt: number;
  seq: number;
  item: T;
}

/** Um sentido do canal (uplink OU downlink): decide por mensagem e agenda as entregas atrasadas. */
export class NetChannel<T> {
  private readonly rng: Rng;
  private readonly deliver: (item: T) => void;
  private queue: Queued<T>[] = [];
  private seq = 0;

  sent = 0;
  delivered = 0;
  dropped = 0;

  constructor(seed: number | Rng, deliver: (item: T) => void) {
    this.rng = typeof seed === 'number' ? mulberry32(seed) : seed;
    this.deliver = deliver;
  }

  get stats(): NetChannelStats {
    return { sent: this.sent, delivered: this.delivered, dropped: this.dropped, pending: this.queue.length };
  }

  /** Devolve false quando a mensagem foi descartada (útil pra log). */
  send(item: T, nowS: number, params: NetParams): boolean {
    this.sent++;
    const fate = decideFate(params, this.rng);
    if (fate.drop) {
      this.dropped++;
      return false;
    }
    if (fate.delay_s <= 0) {
      this.delivered++;
      this.deliver(item);
      return true;
    }
    this.queue.push({ deliverAt: nowS + fate.delay_s, seq: this.seq++, item });
    return true;
  }

  /** Entrega tudo que venceu até `nowS`, em ordem (deliverAt, seq). */
  advanceTo(nowS: number): void {
    if (this.queue.length === 0) return;
    const t = nowS + 1e-9;
    const due = this.queue.filter((q) => q.deliverAt <= t);
    if (due.length === 0) return;
    this.queue = this.queue.filter((q) => q.deliverAt > t);
    due.sort((a, b) => a.deliverAt - b.deliverAt || a.seq - b.seq);
    for (const q of due) {
      this.delivered++;
      this.deliver(q.item);
    }
  }

  clear(): void {
    this.queue = [];
  }
}

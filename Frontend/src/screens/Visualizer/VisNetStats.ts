import { INACTIVE_AFTER_S } from '../../Consts/SimulationConsts';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { VisRobotMapper } from '../../mapper/VisRobot.Mapper';
import type {
  DurationStatsModel,
  NetBucketModel,
  NetCountsModel,
  NetSnapshotModel,
  RobotNetSnapshotModel,
} from '../../model/VisNetStats.Model';

/** Janelas do painel "Rede" (ms). A maior decide quanto histórico fica guardado. */
export const NET_WINDOWS_MS = [60_000, 300_000] as const;
const KEEP_MS = Math.max(...NET_WINDOWS_MS);

/** Taxa do DOTBOT_ADVERTISEMENT no firmware 1.23.0 (DB_ADVERTIZEMENT_DELAY_MS = 500 → 2 Hz). */
export const DEFAULT_EXPECTED_HZ = 2;

/** Quantos pedaços a janela vira nos gráficos (1 min → 2 s cada; 5 min → 10 s). */
export const NET_BUCKETS = 30;

/**
 * A perda de cada pedaço do gráfico é a dos últimos 10 s até o fim dele
 * (média móvel): a 2 Hz um pedaço de 2 s tem 4 anúncios, e a perda pedaço a
 * pedaço só daria 0, 25, 50… — um serrote que não diz nada.
 */
const LOSS_SPAN_MS = 10_000;

/**
 * Buraco a partir do qual não é mais "pacote perdido", e sim o robô fora do
 * ar — o mesmo silêncio que vira Inactive na borda. Esses buracos entram nas
 * quedas (robot:status), não na perda de pacote.
 */
const OUTAGE_MS = INACTIVE_AFTER_S * 1000;

/** Latência abaixo disso (ms) = relógios diferentes (borda adiantada). Na mesma máquina nunca fica negativa. */
const CLOCK_SKEW_TOLERANCE_MS = -10;

interface TelemetrySample {
  /** Chegada neste navegador (ms). */
  at: number;
  /** at − updatedAt da borda (ms). */
  latency: number;
  /** updatedAt − updatedAt do anúncio anterior do mesmo robô (ms); null = começo de sequência. */
  gap: number | null;
}

interface CommandSample {
  at: number;
  rtt: number;
  ok: boolean;
}

interface StatusEvent {
  at: number;
  status: RobotStatus;
  /** Saiu de Active nesta mudança. */
  fromActive: boolean;
}

interface RobotRaw {
  telemetry: TelemetrySample[];
  commands: CommandSample[];
  events: StatusEvent[];
  /** updatedAt (borda) do último anúncio da sequência atual; null = sequência interrompida. */
  lastEdgeAt: number | null;
  /** Último status conhecido (pra contar só mudança vista ao vivo). */
  status: RobotStatus | null;
}

function newRaw(): RobotRaw {
  return { telemetry: [], commands: [], events: [], lastEdgeAt: null, status: null };
}

/** Acrescenta e joga fora o que ficou mais velho que a maior janela. */
function pushKept<T extends { at: number }>(list: T[], item: T): void {
  list.push(item);
  const limit = item.at - KEEP_MS;
  let drop = 0;
  while (drop < list.length && list[drop].at < limit) drop++;
  if (drop > 0) list.splice(0, drop);
}

/** Anúncios que faltaram num buraco: quantos intervalos cabem nele menos o que chegou. */
export function missedInGap(gap: number | null, intervalMs: number): number {
  if (gap === null || gap >= OUTAGE_MS) return 0;
  return Math.max(0, Math.round(gap / intervalMs) - 1);
}

/** Média, p95 (posto mais próximo) e extremos; null sem valores. */
export function durationStats(values: readonly number[]): DurationStatsModel | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  return {
    count: sorted.length,
    mean: sum / sorted.length,
    p95: sorted[Math.max(0, Math.ceil(0.95 * sorted.length) - 1)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

function lossPct(received: number, missed: number): number | null {
  const expected = received + missed;
  return expected > 0 ? (missed / expected) * 100 : null;
}

/** Soma o que cai na janela, de um robô ou da frota. */
class Counts {
  private latencies: number[] = [];
  private gaps: number[] = [];
  private rtts: number[] = [];
  received = 0;
  missed = 0;
  commandsOk = 0;
  commandsFailed = 0;
  drops = 0;
  losts = 0;

  /** Quanto cada intervalo fugiu da grade da taxa esperada (descontados os anúncios perdidos no meio). */
  private offsets: number[] = [];

  telemetry(s: TelemetrySample, missed: number, intervalMs: number): void {
    this.received++;
    this.missed += missed;
    this.latencies.push(s.latency);
    if (s.gap !== null && s.gap < OUTAGE_MS) {
      this.gaps.push(s.gap);
      this.offsets.push(s.gap - (missed + 1) * intervalMs);
    }
  }

  command(c: CommandSample): void {
    if (c.ok) {
      this.commandsOk++;
      this.rtts.push(c.rtt);
    } else {
      this.commandsFailed++;
    }
  }

  event(e: StatusEvent): void {
    if (e.fromActive) this.drops++;
    if (e.status === RobotStatus.Lost) this.losts++;
  }

  get minLatency(): number {
    return this.latencies.reduce((m, v) => Math.min(m, v), Infinity);
  }

  result(): NetCountsModel {
    const gapMean = this.gaps.length > 0 ? this.gaps.reduce((s, v) => s + v, 0) / this.gaps.length : null;
    // Raiz da média dos desvios ao quadrado em relação à grade da taxa esperada.
    const jitter = this.offsets.length > 0 ? Math.sqrt(this.offsets.reduce((s, v) => s + v * v, 0) / this.offsets.length) : null;
    return {
      received: this.received,
      missed: this.missed,
      lossPct: lossPct(this.received, this.missed),
      latency: durationStats(this.latencies),
      measuredHz: gapMean !== null && gapMean > 0 ? 1000 / gapMean : null,
      intervalJitter: jitter,
      commandsOk: this.commandsOk,
      commandsFailed: this.commandsFailed,
      commandRtt: durationStats(this.rtts),
      drops: this.drops,
      losts: this.losts,
    };
  }
}

// Números de rede do Visualizador, fora do React (como o VisFleet): o
// useVisualizer registra cada anúncio que chega pelo socket, cada comando
// mandado e cada mudança de status, e o painel "Rede" pede uma fotografia
// da janela (snapshot) uma vez por segundo.
//
// - Latência = chegada neste navegador − `updatedAt` que a borda carimbou
//   quando o frame chegou do gateway (borda → API → socket → tela). A perna
//   do rádio (robô → gateway) não dá pra medir: o anúncio não tem horário.
//   Os dois relógios têm que ser o mesmo (borda e navegador na mesma
//   máquina); se não forem, a diferença entre eles entra na conta.
// - Perda de pacote: o anúncio não tem número de sequência, então ela é
//   estimada pelos buracos entre dois anúncios seguidos do mesmo robô
//   (horário da borda) contra a taxa esperada. Buraco de 5 s ou mais é
//   queda do robô, não perda (vira Inactive na borda). Socket caído
//   interrompe a sequência, pra queda da tela não contar como perda do rádio.
// - Comandos: ida e volta da chamada REST (tela → API → borda → resposta);
//   o robô não confirma.
// - Quedas: mudanças de status vistas ao vivo (robot:status); o status que
//   chega pelo GET /robots só serve de ponto de partida.
export class VisNetStats {
  private robots = new Map<string, RobotRaw>();

  private raw(address: string): RobotRaw {
    const k = VisRobotMapper.key(address);
    let r = this.robots.get(k);
    if (!r) {
      r = newRaw();
      this.robots.set(k, r);
    }
    return r;
  }

  /** Anúncio que chegou pelo socket (robot:updates). `edgeAt` = updatedAt da borda; `at` = Date.now() na chegada. */
  telemetry(address: string, edgeAt: number, at: number): void {
    const r = this.raw(address);
    if (r.lastEdgeAt !== null && edgeAt < r.lastEdgeAt) return; // fora de ordem: mais velho que o último
    const gap = r.lastEdgeAt === null ? null : edgeAt - r.lastEdgeAt;
    r.lastEdgeAt = edgeAt;
    pushKept(r.telemetry, { at, latency: at - edgeAt, gap });
  }

  /** Comando REST que voltou (ok ou erro da API). `rtt` em ms. */
  command(address: string, rtt: number, ok: boolean, at: number): void {
    pushKept(this.raw(address).commands, { at, rtt, ok });
  }

  /** Status conhecido sem ter visto a mudança (GET /robots, robot:new): não conta queda. */
  seedStatus(address: string, status: RobotStatus): void {
    this.raw(address).status = status;
  }

  /** robot:status: conta a mudança, se for mesmo mudança. */
  status(address: string, status: RobotStatus, at: number): void {
    const r = this.raw(address);
    const prev = r.status;
    r.status = status;
    if (prev === null || prev === status) return;
    pushKept(r.events, { at, status, fromActive: prev === RobotStatus.Active });
  }

  /** O socket caiu ou voltou: o próximo anúncio de cada robô começa sequência nova. */
  breakSequences(): void {
    for (const r of this.robots.values()) r.lastEdgeAt = null;
  }

  /** Esquece tudo (link novo). */
  clear(): void {
    this.robots = new Map();
  }

  /** Zera os números (botão Zerar), mantendo o status e a sequência de cada robô. */
  resetCounters(): void {
    for (const r of this.robots.values()) {
      r.telemetry = [];
      r.commands = [];
      r.events = [];
    }
  }

  /** Fotografia da janela que termina em `now`. */
  snapshot(now: number, windowMs: number, expectedHz: number): NetSnapshotModel {
    const from = now - windowMs;
    const intervalMs = 1000 / expectedHz;
    const bucketMs = windowMs / NET_BUCKETS;
    const acc = Array.from({ length: NET_BUCKETS }, () => ({ received: 0, missed: 0, latSum: 0, latMax: -Infinity }));
    const fleet = new Counts();
    const robots = new Map<string, RobotNetSnapshotModel>();
    const inWindow = (at: number) => at >= from && at <= now;

    for (const [key, r] of this.robots) {
      const counts = new Counts();
      for (const s of r.telemetry) {
        if (!inWindow(s.at)) continue;
        const missed = missedInGap(s.gap, intervalMs);
        counts.telemetry(s, missed, intervalMs);
        fleet.telemetry(s, missed, intervalMs);
        const b = acc[Math.min(NET_BUCKETS - 1, Math.floor((s.at - from) / bucketMs))];
        b.received++;
        b.missed += missed;
        b.latSum += s.latency;
        b.latMax = Math.max(b.latMax, s.latency);
      }
      for (const c of r.commands) {
        if (!inWindow(c.at)) continue;
        counts.command(c);
        fleet.command(c);
      }
      for (const e of r.events) {
        if (!inWindow(e.at)) continue;
        counts.event(e);
        fleet.event(e);
      }
      robots.set(key, { key, ...counts.result() });
    }

    const span = Math.max(1, Math.round(LOSS_SPAN_MS / bucketMs)); // pedaços na média móvel da perda
    const buckets: NetBucketModel[] = acc.map((b, i) => {
      const trail = acc.slice(Math.max(0, i - span + 1), i + 1);
      const received = trail.reduce((sum, t) => sum + t.received, 0);
      const missed = trail.reduce((sum, t) => sum + t.missed, 0);
      return {
        start: from + i * bucketMs,
        end: from + (i + 1) * bucketMs,
        received: b.received,
        latencyMean: b.received > 0 ? b.latSum / b.received : null,
        latencyMax: b.received > 0 ? b.latMax : null,
        lossMissed: missed,
        lossExpected: received + missed,
        lossPct: lossPct(received, missed),
      };
    });

    return {
      at: now,
      windowMs,
      expectedHz,
      fleet: fleet.result(),
      robots,
      buckets,
      lossSpanMs: span * bucketMs,
      clockSkew: fleet.minLatency < CLOCK_SKEW_TOLERANCE_MS,
    };
  }
}

import type { KeyValueItem } from '../components/KeyValueList/KeyValueList';
import type { DurationStatsModel, NetCountsModel } from '../model/VisNetStats.Model';

/** ms com 1 casa abaixo de 10 (latência de rede local fica nessa faixa). */
function ms(v: number): string {
  return Math.abs(v) < 10 ? v.toFixed(1) : String(Math.round(v));
}

/** % com 1 casa abaixo de 10; null = "—". */
function pct(v: number | null): string {
  if (v === null) return '—';
  return v < 10 ? v.toFixed(1) : String(Math.round(v));
}

function hz(v: number | null): string {
  return v === null ? '—' : v.toFixed(1);
}

/** 60000 → "1 min"; 5000 → "5 s". */
function duration(msValue: number): string {
  const s = Math.round(msValue / 1000);
  return s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} s`;
}

function latencyText(stats: DurationStatsModel | null): string {
  return stats ? `méd ${ms(stats.mean)} · p95 ${ms(stats.p95)} · máx ${ms(stats.max)} ms` : '—';
}

function lossText(c: NetCountsModel): string {
  const expected = c.received + c.missed;
  return expected > 0 ? `${pct(c.lossPct)} % (${c.missed} de ${expected})` : '—';
}

function rateText(c: NetCountsModel, expectedHz: number): string {
  return `chegam ${hz(c.measuredHz)} Hz (esperada ${hz(expectedHz)})`;
}

function jitterText(c: NetCountsModel): string {
  return c.intervalJitter === null ? '—' : `± ${ms(c.intervalJitter)} ms`;
}

function commandsText(c: NetCountsModel): string {
  if (c.commandsOk + c.commandsFailed === 0) return 'nenhum';
  return `${c.commandsOk} ok · ${c.commandsFailed} com erro`;
}

function dropsText(c: NetCountsModel): string {
  return `${c.drops} queda(s) · ${c.losts} Lost`;
}

/** Os números de um robô (ou da frota) em lista chave → valor. */
function items(c: NetCountsModel, expectedHz: number): KeyValueItem[] {
  return [
    { label: 'perda', value: lossText(c) },
    { label: 'latência', value: latencyText(c.latency) },
    { label: 'taxa', value: rateText(c, expectedHz) },
    { label: 'variação', value: jitterText(c) },
    { label: 'comandos', value: commandsText(c) },
    { label: 'ida/volta', value: latencyText(c.commandRtt) },
    { label: 'quedas', value: dropsText(c) },
  ];
}

/** Taxa medida bem acima da esperada: a perda sai subestimada (taxa esperada errada). */
function rateAboveExpected(c: NetCountsModel, expectedHz: number): boolean {
  return c.measuredHz !== null && c.measuredHz > expectedHz * 1.25;
}

// Textos do painel "Rede" do Visualizador e da seção Rede do drawer do robô
// (os dois mostram os mesmos números, da mesma janela — ver VisNetStats).
export const NetStatsMapper = {
  ms,
  pct,
  hz,
  duration,
  latencyText,
  lossText,
  rateText,
  jitterText,
  commandsText,
  dropsText,
  items,
  rateAboveExpected,
};

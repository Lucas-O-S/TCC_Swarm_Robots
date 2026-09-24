import type { ChangeEvent } from 'react';
import type { FleetUplink } from '../../Integration/FleetLink';
import type { SimConfigModel } from '../../model/Scenario.Model';
import type { NetChannelStats } from '../../screens/Simulation/SimNetModel';
import type { NetConfigValues, SimMode } from '../../screens/Simulation/useSimulation';
import styles from './NetworkPanel.module.css';

interface NetworkPanelProps {
  mode: SimMode;
  value: NetConfigValues;
  onChange: (patch: Partial<NetConfigValues>) => void;
  /** Parâmetros do cenário (só editáveis no modo Editar). */
  sim: SimConfigModel | null;
  onSimChange: (patch: Partial<Pick<SimConfigModel, 'tick_hz' | 'advertise_hz' | 'battery_drain_per_min'>>) => void;
  stats: { uplink: NetChannelStats; downlink: NetChannelStats } | null;
  received: Record<FleetUplink['kind'], number> | null;
}

function SliderRow({
  label,
  unit,
  min,
  max,
  value,
  disabled,
  title,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  disabled: boolean;
  title: string;
  onChange: (v: number) => void;
}) {
  function handle(e: ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    if (Number.isFinite(v)) onChange(v);
  }
  return (
    <label className={styles.field} title={title} style={{ opacity: disabled ? 0.5 : 1 }}>
      <span>
        {label}: <strong>{value}</strong> {unit}
      </span>
      <input type="range" min={min} max={max} step={1} value={value} disabled={disabled} onChange={handle} />
    </label>
  );
}

// Cartão "Rede" — o menu "Configurações de rede" do RobotSwarmSimulator
// (PDR, latência e jitter, lidos por mensagem pelo gateway) + os
// parâmetros de simulação do cenário e as estatísticas do canal. No modo
// Simular as mudanças valem na hora (Reiniciar volta aos valores do
// cenário); no Editar elas ficam salvas no cenário.
export function NetworkPanel({ mode, value, onChange, sim, onSimChange, stats, received }: NetworkPanelProps) {
  const degraded = value.enabled && (value.pdr_percent < 100 || value.slot_latency_ms > 0 || value.jitter_ms > 0);
  const off = !value.enabled;

  function numberField(field: 'tick_hz' | 'advertise_hz' | 'battery_drain_per_min', min: number, step: number) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      if (Number.isFinite(v) && v >= min) onSimChange({ [field]: step >= 1 ? Math.round(v) : v });
    };
  }

  return (
    <div className={styles.section}>
      <div className={styles.status}>
        <span className={`${styles.dot} ${degraded ? styles.dotWarn : styles.dotOn}`} />
        {degraded ? 'degradação ativa' : 'rede perfeita'}
      </div>

      <label className={styles.checkbox} title="Desligado = sem perda nem atraso (ignora PDR/latência/jitter)">
        <input type="checkbox" checked={value.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
        Degradação de rede ligada
      </label>

      <SliderRow
        label="PDR"
        unit="%"
        min={0}
        max={100}
        value={value.pdr_percent}
        disabled={off}
        title="Packet delivery ratio: cada mensagem (uplink e downlink) é descartada com probabilidade 1 − PDR/100"
        onChange={(v) => onChange({ pdr_percent: v })}
      />
      <SliderRow
        label="Latência"
        unit="ms"
        min={0}
        max={1000}
        value={value.slot_latency_ms}
        disabled={off}
        title="Atraso base por mensagem (latência de slot TSCH lógica; no Mari real ~63–150 ms)"
        onChange={(v) => onChange({ slot_latency_ms: v })}
      />
      <SliderRow
        label="Jitter"
        unit="ms"
        min={0}
        max={500}
        value={value.jitter_ms}
        disabled={off}
        title="Jitter uniforme em [0, jitter] somado à latência"
        onChange={(v) => onChange({ jitter_ms: v })}
      />

      {mode === 'edit' && sim && (
        <>
          <p className={styles.subtitle}>Simulação</p>
          <div className={styles.fieldRow}>
            <label className={styles.field}>
              Tick (Hz)
              <input type="number" min={1} max={200} value={sim.tick_hz} onChange={numberField('tick_hz', 1, 1)} />
            </label>
            <label className={styles.field}>
              Advertise (Hz)
              <input type="number" min={0.1} step={0.5} value={sim.advertise_hz} onChange={numberField('advertise_hz', 0.1, 0.5)} />
            </label>
            <label className={styles.field}>
              Bateria (%/min)
              <input
                type="number"
                min={0}
                step={0.1}
                value={sim.battery_drain_per_min}
                onChange={numberField('battery_drain_per_min', 0, 0.1)}
              />
            </label>
          </div>
        </>
      )}

      {mode === 'sim' && stats && (
        <>
          <p className={styles.subtitle}>Canal</p>
          <div className={styles.stats}>
            <span className={styles.statsHead} />
            <span className={styles.statsHead}>env.</span>
            <span className={styles.statsHead}>entr.</span>
            <span className={styles.statsHead}>perd.</span>
            <span className={styles.statsHead}>fila</span>
            <span>⇧ uplink</span>
            <span>{stats.uplink.sent}</span>
            <span>{stats.uplink.delivered}</span>
            <span>{stats.uplink.dropped}</span>
            <span>{stats.uplink.pending}</span>
            <span>⇩ downlink</span>
            <span>{stats.downlink.sent}</span>
            <span>{stats.downlink.delivered}</span>
            <span>{stats.downlink.dropped}</span>
            <span>{stats.downlink.pending}</span>
          </div>
          {received && (
            <p className={styles.hint}>
              Backend local recebeu {received['node-data']} DOTBOT_ADVERTISEMENT · {received['node-keep-alive']} KEEP_ALIVE ·{' '}
              {received['gateway-info']} GATEWAY_INFO · {received['node-joined']} JOINED / {received['node-left']} LEFT ·{' '}
              {received['swarmit-data']} swarmit.
            </p>
          )}
        </>
      )}
    </div>
  );
}

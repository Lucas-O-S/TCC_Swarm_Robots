import { Button } from '../Button/Button';
import { DrawerActions, DrawerField, DrawerHint, DrawerRow, DrawerSubtitle } from '../Drawer/DrawerForm';
import { num } from '../Drawer/numInput';
import { KeyValueList } from '../KeyValueList/KeyValueList';
import { MiniLineChart } from '../MiniLineChart/MiniLineChart';
import type { MiniLinePoint } from '../MiniLineChart/MiniLineChart';
import { RobotChip } from '../RobotChip/RobotChip';
import { Segmented } from '../Segmented/Segmented';
import { StatTile, StatTiles } from '../StatTile/StatTile';
import { StatusLine, StatusSep } from '../StatusLine/StatusLine';
import { INACTIVE_AFTER_S } from '../../Consts/SimulationConsts';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { useMapSelection } from '../../hooks/useMapElements';
import { NetStatsMapper } from '../../mapper/NetStats.Mapper';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import type { NetBucketModel, NetSnapshotModel, VisNetRowModel } from '../../model/VisNetStats.Model';
import { robotSelId } from '../../screens/Simulation/hooks/useSimSelection';
import { NET_WINDOWS_MS } from '../../screens/Visualizer/VisNetStats';
import styles from './NetStatsPanel.module.css';

const { ms, pct, hz, duration } = NetStatsMapper;

interface NetStatsPanelProps {
  snapshot: NetSnapshotModel;
  /** Robôs da API, na ordem da lista (R1, R2…). */
  rows: VisNetRowModel[];
  connected: boolean;
  onWindowChange: (ms: number) => void;
  onExpectedHzChange: (hz: number) => void;
  onReset: () => void;
}

/** "há 12 s" do fim de um pedaço até o fim da janela. */
function agoText(snapshot: NetSnapshotModel, b: NetBucketModel): string {
  const s = Math.round((snapshot.at - b.end) / 1000);
  return s <= 0 ? 'agora' : `há ${duration(s * 1000)}`;
}

/** Último ponto com dado (o "agora" do título do gráfico). */
function lastValue(points: MiniLinePoint[]): string | undefined {
  for (let i = points.length - 1; i >= 0; i--) if (points[i].y !== null) return points[i].value;
  return undefined;
}

// Cartão "Rede" do Visualizador: latência, perda de pacote e perda de
// robôs, da frota e de cada robô, numa janela (1 ou 5 min). Os números vêm
// do VisNetStats (ver lá como cada um é medido); clicar num robô abre o
// drawer dele, que tem a mesma seção. Só leitura: não manda nada pra API.
export function NetStatsPanel({ snapshot, rows, connected, onWindowChange, onExpectedHzChange, onReset }: NetStatsPanelProps) {
  const { selectedIds, selectOnly } = useMapSelection();
  const { fleet, buckets, windowMs, expectedHz } = snapshot;
  const step = duration(windowMs / buckets.length);
  const out = rows.filter((r) => r.status !== RobotStatus.Active);

  const latencyPoints: MiniLinePoint[] = buckets.map((b) => ({
    y: b.latencyMean,
    value: b.latencyMean === null ? '' : `${ms(b.latencyMean)} ms`,
    detail: `máx ${b.latencyMax === null ? '—' : ms(b.latencyMax)} ms · ${b.received} anúncio(s) · ${agoText(snapshot, b)}`,
  }));
  const lossPoints: MiniLinePoint[] = buckets.map((b) => ({
    y: b.lossPct,
    value: `${pct(b.lossPct)} %`,
    detail: `${b.lossMissed} de ${b.lossExpected} em ${duration(snapshot.lossSpanMs)} · ${agoText(snapshot, b)}`,
  }));

  return (
    <div className={styles.panel}>
      <StatusLine tone={connected ? 'on' : 'off'}>
        {connected ? 'ao vivo' : 'sem conexão'}
        <StatusSep />
        janela de {duration(windowMs)}
        <StatusSep />
        {fleet.received} anúncio(s)
      </StatusLine>

      <DrawerRow>
        <DrawerField as="div" label="Janela">
          <Segmented
            ariaLabel="Janela"
            options={NET_WINDOWS_MS.map((w) => ({ value: w, label: duration(w) }))}
            value={windowMs}
            onChange={onWindowChange}
          />
        </DrawerField>
        <DrawerField
          label="Taxa esperada (Hz)"
          title="Taxa do DOTBOT_ADVERTISEMENT: 2 Hz no firmware 1.23.0; no simulador, o advertise_hz do cenário"
        >
          <input type="number" min={0.1} step={0.5} value={expectedHz} onChange={num((v) => v > 0 && onExpectedHzChange(v))} />
        </DrawerField>
      </DrawerRow>

      {snapshot.clockSkew && (
        <StatusLine tone="warn">
          Latência negativa: o relógio da borda está adiantado em relação a este navegador. Com borda e navegador em máquinas
          diferentes, a latência não vale.
        </StatusLine>
      )}
      {NetStatsMapper.rateAboveExpected(fleet, expectedHz) && (
        <StatusLine tone="warn">
          Chegam ~{hz(fleet.measuredHz)} Hz por robô, acima da taxa esperada: a perda sai subestimada. Ajuste a taxa esperada.
        </StatusLine>
      )}

      <StatTiles>
        <StatTile
          label="Latência p95"
          value={fleet.latency ? `${ms(fleet.latency.p95)} ms` : '—'}
          detail={fleet.latency ? `méd ${ms(fleet.latency.mean)} ms` : 'borda → tela'}
          title="Borda → tela: 95% dos anúncios chegaram nesta tela em até esse tempo depois de a borda receber o frame"
        />
        <StatTile
          label="Perda de pacote"
          value={fleet.lossPct === null ? '—' : `${pct(fleet.lossPct)} %`}
          detail={`${fleet.missed} de ${fleet.received + fleet.missed}`}
          title="Anúncios que faltaram (estimados) sobre os esperados"
        />
        <StatTile
          label="Robôs fora"
          value={`${out.length} de ${rows.length}`}
          detail={`${fleet.drops} queda(s)`}
          title={`Robôs que não estão Active agora (${INACTIVE_AFTER_S} s sem anúncio → Inactive) e quantas vezes algum saiu de Active na janela`}
        />
      </StatTiles>

      <MiniLineChart
        title={`Latência (média a cada ${step})`}
        current={lastValue(latencyPoints)}
        points={latencyPoints}
        unit="ms"
        minTop={50}
        startLabel={`−${duration(windowMs)}`}
        endLabel="agora"
        emptyText="Nenhum anúncio na janela."
      />
      <MiniLineChart
        title={`Perda de pacote (últimos ${duration(snapshot.lossSpanMs)})`}
        current={lastValue(lossPoints)}
        points={lossPoints}
        unit="%"
        minTop={10}
        startLabel={`−${duration(windowMs)}`}
        endLabel="agora"
        emptyText="Nenhum anúncio na janela."
      />

      <KeyValueList items={NetStatsMapper.items(fleet, expectedHz)} />

      <DrawerSubtitle>Robôs fora</DrawerSubtitle>
      {out.length === 0 ? (
        <DrawerHint>{rows.length > 0 ? 'Todos os robôs da API estão Active.' : 'Nenhum robô na API.'}</DrawerHint>
      ) : (
        out.map((r) => (
          <StatusLine key={r.address} tone={SimRobotMapper.statusTone(r.status)}>
            {r.label} · {SimRobotMapper.statusLabel(r.status)}
            <StatusSep />
            {r.silenceS === null ? 'sem anúncio' : `sem anúncio há ${r.silenceS} s`}
          </StatusLine>
        ))
      )}

      <DrawerSubtitle>Por robô</DrawerSubtitle>
      {rows.length === 0 ? (
        <DrawerHint>Os robôs aparecem aqui conforme a API manda.</DrawerHint>
      ) : (
        <div className={styles.table} role="table" aria-label="Rede por robô">
          <div className={`${styles.row} ${styles.headRow}`} role="row">
            <span role="columnheader">robô</span>
            <span role="columnheader">perda</span>
            <span role="columnheader">p95</span>
            <span role="columnheader">taxa</span>
            <span role="columnheader">quedas</span>
          </div>
          {rows.map((r) => {
            const n = r.net;
            const selected = selectedIds.has(robotSelId(r.address));
            return (
              <button
                key={r.address}
                type="button"
                role="row"
                className={`${styles.row} ${styles.robotRow} ${selected ? styles.selected : ''}`}
                aria-pressed={selected}
                title={`${r.address} — clique pra abrir o robô`}
                onClick={() => selectOnly(robotSelId(r.address))}
              >
                <span role="cell">
                  <StatusLine inline tone={SimRobotMapper.statusTone(r.status)} title={SimRobotMapper.statusLabel(r.status)}>
                    <RobotChip label={r.label} color={r.color} />
                  </StatusLine>
                </span>
                <span role="cell">{n?.lossPct != null ? `${pct(n.lossPct)} %` : '—'}</span>
                <span role="cell">{n?.latency ? `${ms(n.latency.p95)} ms` : '—'}</span>
                <span role="cell">{n?.measuredHz != null ? `${hz(n.measuredHz)} Hz` : '—'}</span>
                <span role="cell">{n ? n.drops : 0}</span>
              </button>
            );
          })}
        </div>
      )}

      <DrawerHint>
        Latência = chegada nesta tela − hora em que a borda recebeu o frame (o rádio robô → gateway não entra: o anúncio não
        tem horário); borda e navegador precisam estar na mesma máquina. Perda = buracos entre anúncios seguidos contra a taxa
        esperada (o anúncio não tem número de sequência); silêncio de {INACTIVE_AFTER_S} s ou mais é queda, não perda.
        Ida/volta = comando da tela até a API responder (o robô não confirma).
      </DrawerHint>

      <DrawerActions>
        <Button variant="outline" onClick={onReset} title="Zera os números e os gráficos (a janela recomeça agora)">
          Zerar
        </Button>
      </DrawerActions>
    </div>
  );
}

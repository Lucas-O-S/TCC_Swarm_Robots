import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import type { Notice } from '../SimulationControls/SimulationControls';
import type { ApiLinkState, ApiLinkStatus } from '../../Integration/ApiLink';
import styles from './VisualizerControls.module.css';

const LINK_LABEL: Record<ApiLinkStatus, string> = {
  unavailable: 'não conectada',
  connecting: 'conectando…',
  connected: 'conectada',
  disconnected: 'desconectada',
};

interface VisualizerControlsProps {
  scenarioName: string;
  /** Tamanho do cenário em blocos (null antes de escolher). */
  size: { cols: number; rows: number } | null;
  obstacleCount: number;
  onChangeScenario: () => void;
  link: ApiLinkState;
  robotCount: number;
  counts: { active: number; inactive: number; lost: number };
  notice: Notice | null;
}

// Header do Visualizador (barra no topo, acima do mapa e do menu) — mesmo
// desenho do SimulationControls, sem nada de edição nem de simulação:
//   1. cenário pronto (só leitura) + Trocar cenário | tamanho em blocos;
//   2. conexão com a API | resumo da frota que a API enxerga.
// Fora do ar, a mensagem do link aparece embaixo (hoje: conexão não implementada).
export function VisualizerControls({
  scenarioName,
  size,
  obstacleCount,
  onChangeScenario,
  link,
  robotCount,
  counts,
  notice,
}: VisualizerControlsProps) {
  const dot = link.status === 'connected' ? styles.dotOn : link.status === 'connecting' ? styles.dotWarn : styles.dotOff;

  return (
    <Card className={styles.header}>
      <div className={styles.row}>
        <div className={styles.group}>
          <span className={styles.label}>Cenário</span>
          <span className={styles.name} title={scenarioName}>
            {scenarioName || '—'}
          </span>
          <Button variant="outline" onClick={onChangeScenario}>
            Trocar cenário
          </Button>
        </div>

        <div className={styles.group}>
          <span className={styles.status} title="O visualizador não edita o cenário nem simula: só mostra e comanda os robôs da API">
            {size ? `${size.cols}×${size.rows} blocos` : 'sem cenário'}
            <span className={styles.sep}>·</span>
            {obstacleCount} obstáculo(s)<span className={styles.sep}>·</span>
            só visualização
          </span>
        </div>
      </div>

      <div className={`${styles.row} ${styles.runRow}`}>
        <div className={styles.group}>
          <span className={styles.status} title={link.message}>
            <span className={`${styles.dot} ${dot}`} />
            API: {LINK_LABEL[link.status]}
          </span>
        </div>

        <div className={styles.group}>
          <span className={styles.status}>
            {robotCount} robô(s) na API<span className={styles.sep}>·</span>
            {counts.active} Active · {counts.inactive} Inactive · {counts.lost} Lost
          </span>
        </div>
      </div>

      {link.status !== 'connected' && <p className={styles.hint}>{link.message}</p>}
      {notice && <p className={notice.kind === 'error' ? styles.error : styles.success}>{notice.text}</p>}
    </Card>
  );
}

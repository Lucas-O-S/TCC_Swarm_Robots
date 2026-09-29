import { Button } from '../Button/Button';
import { HeaderBar, HeaderGroup, HeaderLabel, HeaderNotice, HeaderRow } from '../HeaderBar/HeaderBar';
import type { Notice } from '../HeaderBar/HeaderBar';
import { StatusLine, StatusSep } from '../StatusLine/StatusLine';
import type { StatusTone } from '../StatusLine/StatusLine';
import type { ApiLinkState, ApiLinkStatus } from '../../Integration/ApiLink';
import styles from './VisualizerControls.module.css';

const LINK_LABEL: Record<ApiLinkStatus, string> = {
  unavailable: 'não conectada',
  connecting: 'conectando…',
  connected: 'conectada',
  disconnected: 'desconectada',
};

const LINK_TONE: Record<ApiLinkStatus, StatusTone> = {
  unavailable: 'off',
  connecting: 'warn',
  connected: 'on',
  disconnected: 'off',
};

interface VisualizerControlsProps {
  scenarioName: string;
  /** Tamanho do cenário em blocos (null antes de escolher). */
  size: { cols: number; rows: number } | null;
  obstacleCount: number;
  onChangeScenario: () => void;
  link: ApiLinkState;
  robotCount: number;
  /** Contagem por status, ex.: "2 Active · 0 Inactive · 1 Lost" (SimRobotMapper.statusSummary). */
  fleetSummary: string;
  notice: Notice | null;
}

// Header do Visualizador (HeaderBar, o mesmo da Simulação), sem nada de
// edição nem de simulação:
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
  fleetSummary,
  notice,
}: VisualizerControlsProps) {
  return (
    <HeaderBar>
      <HeaderRow>
        <HeaderGroup>
          <HeaderLabel>Cenário</HeaderLabel>
          <span className={styles.name} title={scenarioName}>
            {scenarioName || '—'}
          </span>
          <Button variant="outline" onClick={onChangeScenario}>
            Trocar cenário
          </Button>
        </HeaderGroup>

        <HeaderGroup>
          <StatusLine inline title="O visualizador não edita o cenário nem simula: só mostra e comanda os robôs da API">
            {size ? `${size.cols}×${size.rows} blocos` : 'sem cenário'}
            <StatusSep />
            {obstacleCount} obstáculo(s)
            <StatusSep />
            só visualização
          </StatusLine>
        </HeaderGroup>
      </HeaderRow>

      <HeaderRow divided>
        <HeaderGroup>
          <StatusLine inline tone={LINK_TONE[link.status]} title={link.message}>
            API: {LINK_LABEL[link.status]}
          </StatusLine>
        </HeaderGroup>

        <HeaderGroup>
          <StatusLine inline>
            {robotCount} robô(s) na API
            <StatusSep />
            {fleetSummary}
          </StatusLine>
        </HeaderGroup>
      </HeaderRow>

      {link.status !== 'connected' && <HeaderNotice kind="muted">{link.message}</HeaderNotice>}
      {notice && <HeaderNotice kind={notice.kind}>{notice.text}</HeaderNotice>}
    </HeaderBar>
  );
}

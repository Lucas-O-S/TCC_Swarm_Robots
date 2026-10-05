import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../Button/Button';
import { HeaderBar, HeaderGroup, HeaderLabel, HeaderNotice, HeaderRow } from '../HeaderBar/HeaderBar';
import type { Notice } from '../HeaderBar/HeaderBar';
import { Segmented } from '../Segmented/Segmented';
import { StatusLine, StatusSep } from '../StatusLine/StatusLine';
import type { SimMode } from '../../screens/Simulation/hooks/useSimulation';
import styles from './SimulationControls.module.css';

interface SimulationControlsProps {
  scenarioName: string;
  onRename: (name: string) => void;
  mode: SimMode;
  onModeChange: (mode: SimMode) => void;
  playing: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  time: number;
  tickHz: number;
  arena: { width: number; height: number };
  onlineCount: number;
  robotCount: number;
  obstacleCount: number;
  onChangeScenario: () => void;
  onImport: (text: string, fileName: string) => void;
  onExportScenario: () => void;
  onExportState: () => void;
  notice: Notice | null;
}

const EDIT_HINT =
  'Editando o estado inicial — a simulação não roda aqui. Ferramentas no canto do mapa: barreira (arraste), robô (clique) e waypoint (clique, com um robô selecionado).';
const API_HINT =
  'A conexão com a API ainda não foi implementada — o gateway simulado conversa com um backend local, que recebe a telemetria e manda os comandos pelos drawers dos robôs. Quando o backend estiver no ar, é trocar o LocalFleetLink pelo MqttFleetLink (mesmo contrato).';

// Header da Simulação (HeaderBar, acima do mapa e do menu) — o papel da
// barra do topo do RobotSwarmSimulator, em duas faixas:
//   1. cenário + Trocar + Editar/Simular | Importar/Exportar;
//   2. Pausar/Reiniciar + relógio/rede (ou resumo do Editar) | API.
export function SimulationControls({
  scenarioName,
  onRename,
  mode,
  onModeChange,
  playing,
  onTogglePlay,
  onReset,
  time,
  tickHz,
  arena,
  onlineCount,
  robotCount,
  obstacleCount,
  onChangeScenario,
  onImport,
  onExportScenario,
  onExportState,
  notice,
}: SimulationControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const simulating = mode === 'sim';

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then((text) => onImport(text, file.name.replace(/\.json$/i, '')));
    e.target.value = '';
  }

  return (
    <HeaderBar>
      <HeaderRow>
        <HeaderGroup>
          <label className={styles.nameField}>
            <HeaderLabel>Cenário</HeaderLabel>
            <input type="text" value={scenarioName} onChange={(e) => onRename(e.target.value)} aria-label="Nome do cenário" />
          </label>
          <Button variant="outline" onClick={onChangeScenario}>
            Trocar cenário
          </Button>
          <Segmented<SimMode>
            ariaLabel="Modo da tela"
            value={mode}
            onChange={onModeChange}
            options={[
              { value: 'edit', label: 'Editar', title: 'Monta o estado inicial: barreiras, robôs, rotas e parâmetros' },
              { value: 'sim', label: 'Simular', title: 'Roda o cenário do zero em tempo real' },
            ]}
          />
        </HeaderGroup>

        <HeaderGroup>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} title="Carrega um cenário .json (mesmo formato do RobotSwarmSimulator)">
            Importar .json
          </Button>
          <Button variant="outline" onClick={onExportScenario} title="Baixa o cenário completo: mapa, robôs, rotas, rede e simulação">
            Exportar cenário
          </Button>
          {simulating && (
            <Button variant="outline" onClick={onExportState} title="Salva as poses ATUAIS como um novo cenário">
              Exportar estado
            </Button>
          )}
          <input ref={fileInputRef} type="file" accept="application/json,.json" className={styles.hiddenInput} onChange={handleFileChange} />
        </HeaderGroup>
      </HeaderRow>

      <HeaderRow divided>
        {simulating ? (
          <HeaderGroup>
            <Button variant="accent" onClick={onTogglePlay} className={styles.playButton}>
              {playing ? 'Pausar' : 'Retomar'}
            </Button>
            <Button variant="outline" onClick={onReset} title="Recarrega o cenário do zero (rede volta aos valores do cenário)">
              Reiniciar
            </Button>
            <StatusLine inline tone={playing ? 'on' : 'warn'}>
              {playing ? 'rodando' : 'pausado'}
              <StatusSep />t = {time.toFixed(1)} s<StatusSep />
              {tickHz} Hz
              <StatusSep />
              {onlineCount}/{robotCount} na rede
            </StatusLine>
          </HeaderGroup>
        ) : (
          <HeaderGroup>
            <StatusLine inline tone="warn" title={EDIT_HINT}>
              editando o estado inicial
              <StatusSep />
              {arena.width}×{arena.height} mm
              <StatusSep />
              {robotCount} robô(s)
              <StatusSep />
              {obstacleCount} barreira(s)
            </StatusLine>
          </HeaderGroup>
        )}

        <HeaderGroup>
          <StatusLine inline tone="muted" title={API_HINT}>
            API: offline · backend local
          </StatusLine>
          <Button variant="outline" disabled title={API_HINT}>
            Conectar à API
          </Button>
        </HeaderGroup>
      </HeaderRow>

      {notice && <HeaderNotice kind={notice.kind}>{notice.text}</HeaderNotice>}
    </HeaderBar>
  );
}

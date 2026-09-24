import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { Segmented } from '../Segmented/Segmented';
import type { SimMode } from '../../screens/Simulation/useSimulation';
import styles from './SimulationControls.module.css';

export interface Notice {
  kind: 'error' | 'info';
  text: string;
}

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

// Header da Simulação (barra no topo, acima do mapa e do menu) — o papel da
// barra do topo do RobotSwarmSimulator, em duas faixas:
//   1. cenário + Trocar + Editar/Simular | Importar/Exportar;
//   2. Pausar/Reiniciar + relógio/rede (ou resumo do Editar) | API.
// Cada faixa quebra de linha quando a tela é estreita.
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
    <Card className={styles.header}>
      <div className={styles.row}>
        <div className={styles.group}>
          <label className={styles.nameField}>
            <span className={styles.label}>Cenário</span>
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
        </div>

        <div className={styles.group}>
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
        </div>
      </div>

      <div className={`${styles.row} ${styles.runRow}`}>
        {simulating ? (
          <div className={styles.group}>
            <Button variant="accent" onClick={onTogglePlay} className={styles.playButton}>
              {playing ? 'Pausar' : 'Retomar'}
            </Button>
            <Button variant="outline" onClick={onReset} title="Recarrega o cenário do zero (rede volta aos valores do cenário)">
              Reiniciar
            </Button>
            <span className={styles.status}>
              <span className={`${styles.dot} ${playing ? styles.dotOn : styles.dotWarn}`} />
              {playing ? 'rodando' : 'pausado'}
              <span className={styles.sep}>·</span>t = {time.toFixed(1)} s<span className={styles.sep}>·</span>
              {tickHz} Hz<span className={styles.sep}>·</span>
              {onlineCount}/{robotCount} na rede
            </span>
          </div>
        ) : (
          <div className={styles.group}>
            <span className={styles.status} title={EDIT_HINT}>
              <span className={`${styles.dot} ${styles.dotWarn}`} />
              editando o estado inicial<span className={styles.sep}>·</span>
              {arena.width}×{arena.height} mm<span className={styles.sep}>·</span>
              {robotCount} robô(s)<span className={styles.sep}>·</span>
              {obstacleCount} barreira(s)
            </span>
          </div>
        )}

        <div className={styles.group}>
          <span className={styles.status} title={API_HINT}>
            <span className={styles.dot} />
            API: offline · backend local
          </span>
          <Button variant="outline" disabled title={API_HINT}>
            Conectar à API
          </Button>
        </div>
      </div>

      {notice && <p className={notice.kind === 'error' ? styles.error : styles.success}>{notice.text}</p>}
    </Card>
  );
}

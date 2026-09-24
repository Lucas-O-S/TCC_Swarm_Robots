import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../Button/Button';
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

// Cartão "Simulação" do menu lateral — o papel da barra do topo do
// RobotSwarmSimulator (Editar/Simular, Play/Pause/Reset, Importar/Exportar,
// Conectar à API), no padrão de menu das outras telas (<Menu> + campos).
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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then((text) => onImport(text, file.name.replace(/\.json$/i, '')));
    e.target.value = '';
  }

  return (
    <div className={styles.section}>
      <div className={styles.scenarioRow}>
        <label className={styles.field}>
          Cenário
          <input type="text" value={scenarioName} onChange={(e) => onRename(e.target.value)} />
        </label>
        <Button variant="outline" onClick={onChangeScenario}>
          Trocar cenário
        </Button>
      </div>

      <Segmented<SimMode>
        ariaLabel="Modo da tela"
        value={mode}
        onChange={onModeChange}
        options={[
          { value: 'edit', label: 'Editar', title: 'Monta o estado inicial: barreiras, robôs, rotas e parâmetros' },
          { value: 'sim', label: 'Simular', title: 'Roda o cenário do zero em tempo real' },
        ]}
      />

      {mode === 'sim' ? (
        <>
          <div className={styles.status}>
            <span className={`${styles.dot} ${playing ? styles.dotOn : styles.dotWarn}`} />
            {playing ? 'rodando' : 'pausado'}
            <span className={styles.sep}>·</span>t = {time.toFixed(1)} s<span className={styles.sep}>·</span>
            {tickHz} Hz<span className={styles.sep}>·</span>
            {onlineCount}/{robotCount} na rede
          </div>
          <div className={styles.actions}>
            <Button variant="accent" onClick={onTogglePlay}>
              {playing ? 'Pausar' : 'Retomar'}
            </Button>
            <Button variant="outline" onClick={onReset} title="Recarrega o cenário do zero (rede volta aos valores do cenário)">
              Reiniciar
            </Button>
          </div>
        </>
      ) : (
        <p className={styles.hint}>
          Editando o estado inicial — a simulação não roda aqui. Ferramentas no canto do mapa: barreira (arraste), robô
          (clique) e waypoint (clique, com um robô selecionado). Arena {arena.width}×{arena.height} mm · {robotCount}{' '}
          robô(s) · {obstacleCount} barreira(s).
        </p>
      )}

      <div className={styles.actions}>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} title="Carrega um cenário .json (mesmo formato do RobotSwarmSimulator)">
          Importar .json
        </Button>
        <Button variant="outline" onClick={onExportScenario} title="Baixa o cenário completo: mapa, robôs, rotas, rede e simulação">
          Exportar cenário
        </Button>
        {mode === 'sim' && (
          <Button variant="outline" onClick={onExportState} title="Salva as poses ATUAIS como um novo cenário">
            Exportar estado
          </Button>
        )}
        <input ref={fileInputRef} type="file" accept="application/json,.json" className={styles.hiddenInput} onChange={handleFileChange} />
      </div>

      {notice && <p className={notice.kind === 'error' ? styles.error : styles.success}>{notice.text}</p>}

      <hr className={styles.divider} />

      <div className={`${styles.status} ${styles.statusNoWrap}`}>
        <span className={styles.dot} />
        <span>API: offline · backend local (em memória)</span>
      </div>
      <Button variant="outline" disabled title="A conexão com a API ainda não foi implementada">
        Conectar à API
      </Button>
      <p className={styles.hint}>
        A conexão com a API ainda não foi implementada — o gateway simulado conversa com um backend local, que recebe a
        telemetria e manda os comandos pelos drawers dos robôs. Quando o backend estiver no ar, é trocar o LocalFleetLink
        pelo MqttFleetLink (mesmo contrato).
      </p>
    </div>
  );
}

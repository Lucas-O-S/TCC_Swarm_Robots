import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../../../../components/Button/Button';
import type { Arena } from '../../core/types';
import styles from './SimulationToolbar.module.css';

interface SimulationToolbarProps {
  scenarioName: string;
  arena: Arena;
  connected: boolean;
  connecting: boolean;
  paused: boolean;
  elapsedSeconds: number;
  tickHz: number;
  brokerUrl: string;
  error: string | null;
  onTogglePause: () => void;
  onReset: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onExport: () => void;
  onImport: (json: string) => void;
}

// BUG PRÉ-EXISTENTE CORRIGIDO: mesmo import de `Button` com profundidade
// errada de `AppRoutes.tsx`/`RobotTelemetryCard.tsx` — corrigido de 3 pra 4
// níveis (`../../../../components/Button/Button`).
//
// Barra de controle da simulação — mesmo papel da barra do RobotSwarmSimulator
// de referência (Pause/Reset/Cenário/Import-Export/Conectar), só que na
// paleta visual do MARI em vez do estilo neutro original.
export function SimulationToolbar({
  scenarioName,
  arena,
  connected,
  connecting,
  paused,
  elapsedSeconds,
  tickHz,
  brokerUrl,
  error,
  onTogglePause,
  onReset,
  onConnect,
  onDisconnect,
  onExport,
  onImport,
}: SimulationToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(onImport);
    e.target.value = '';
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.row}>
        <span className={styles.scenario}>Cenário: {scenarioName}</span>

        <div className={styles.actions}>
          <Button variant="outline" onClick={onTogglePause}>
            {paused ? 'Retomar' : 'Pausar'}
          </Button>
          <Button variant="outline" onClick={onReset}>
            Reset
          </Button>
          <Button variant="outline" onClick={onExport}>
            Exportar estado
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Importar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className={styles.hiddenInput}
            onChange={handleFileChange}
          />
          {connected ? (
            <Button variant="outline" onClick={onDisconnect}>
              Desconectar da API
            </Button>
          ) : (
            <Button variant="accent" onClick={onConnect} disabled={connecting}>
              {connecting ? 'Conectando...' : 'Conectar à API'}
            </Button>
          )}
        </div>
      </div>

      <div className={styles.status}>
        <span className={connected ? styles.dotOn : styles.dotOff} />
        {connected ? `conectado · ${brokerUrl}` : 'desconectado'}
        <span className={styles.sep}>·</span>
        t = {elapsedSeconds.toFixed(1)}s
        <span className={styles.sep}>·</span>
        {tickHz}Hz
        <span className={styles.sep}>·</span>
        arena {arena.widthMm}×{arena.heightMm}mm
        {error && <span className={styles.error}> · {error}</span>}
      </div>
    </div>
  );
}

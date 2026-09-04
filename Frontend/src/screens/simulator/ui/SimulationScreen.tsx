import { useState } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { SimulationToolbar } from './components/SimulationToolbar';
import { SimulationMap } from './components/SimulationMap';
import { RobotTelemetryPanel } from './components/RobotTelemetryPanel';
import styles from './SimulationScreen.module.css';

function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Tela de Simulação: o simulador entra como "gateway + frota" do backend
// (ver AGENTS.md, "Conexão com o RobotSwarmSimulator" e SIMULADOR_PLANO.md).
// Layout inspirado no RobotSwarmSimulator de referência — toolbar de
// controle, mapa 2D e painel de telemetria por robô — na paleta visual MARI.
export function SimulationScreen() {
  const sim = useSimulation();
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  const brokerUrl = import.meta.env.VITE_MQTT_WS_URL || 'ws://localhost:9001';

  function handleExport() {
    downloadJson(`${sim.scenarioName.replace(/\s+/g, '-')}.json`, sim.exportScenario());
  }

  return (
    <div className={styles.screen}>
      <SimulationToolbar
        scenarioName={sim.scenarioName}
        arena={sim.arena}
        connected={sim.connected}
        connecting={sim.connecting}
        paused={sim.paused}
        elapsedSeconds={sim.elapsedSeconds}
        tickHz={sim.tickHz}
        brokerUrl={brokerUrl}
        error={sim.error}
        onTogglePause={sim.togglePause}
        onReset={() => sim.reset()}
        onConnect={sim.connect}
        onDisconnect={sim.disconnect}
        onExport={handleExport}
        onImport={sim.importScenario}
      />

      <div className={styles.body}>
        <SimulationMap
          arena={sim.arena}
          robots={sim.robots}
          obstacles={sim.obstacles}
          selectedAddress={selectedAddress}
          onSelect={setSelectedAddress}
        />

        <RobotTelemetryPanel
          robots={sim.robots}
          selectedAddress={selectedAddress}
          onSelect={setSelectedAddress}
          onDropFailure={sim.dropRobot}
          onReconnect={sim.reconnectRobot}
        />
      </div>
    </div>
  );
}

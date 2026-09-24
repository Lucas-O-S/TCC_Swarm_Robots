import { Badge } from '../Badge/Badge';
import type { BadgeTone } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { SwarmitDeviceStatus } from '../../enums/SwarmitDeviceStatus.enum';
import { swarmitStatusName } from '../../Integration/Protocols/Swarmit/Swarmit.Protocol';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import type { SwarmitDeviceView } from '../../screens/Simulation/SimGateway';
import styles from './SwarmitPanel.module.css';

interface SwarmitPanelProps {
  enabled: boolean;
  onToggle: (on: boolean) => void;
  robots: { address: string; label: string; device: SwarmitDeviceView | null; otaProgress: number | null }[];
  onStartAll: () => void;
}

const STATUS_TONE: Record<SwarmitDeviceStatus, BadgeTone> = {
  [SwarmitDeviceStatus.Bootloader]: 'muted',
  [SwarmitDeviceStatus.Running]: 'green',
  [SwarmitDeviceStatus.Stopping]: 'yellow',
  [SwarmitDeviceStatus.Resetting]: 'yellow',
  [SwarmitDeviceStatus.Programming]: 'blue',
};

// Cartão "Swarmit" — o painel homônimo do RobotSwarmSimulator: aqui a tela
// faz o papel do backend (orquestrador) e o simulador só reage (máquina de
// estados Bootloader → Programming → Running). Ações por robô ficam no drawer.
export function SwarmitPanel({ enabled, onToggle, robots, onStartAll }: SwarmitPanelProps) {
  return (
    <div className={styles.section}>
      <label className={styles.checkbox} title="Liga a camada de orquestração: os robôs passam a bootar no bootloader">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        Camada swarmit (a tela = backend)
      </label>

      {!enabled ? (
        <p className={styles.hint}>Desligada: o simulador só roda o app DotBot, com todos os robôs já em execução.</p>
      ) : (
        <>
          <p className={styles.hint}>
            Como no hardware, o robô boota no Bootloader e fica invisível pro backend (não manda DOTBOT_ADVERTISEMENT) até
            receber um START. Flash = OTA_START + chunks com ACK (reenvia o que a rede perder).
          </p>
          <div className={styles.actions}>
            <Button variant="accent" onClick={onStartAll} title="Manda START robô a robô, com o address (nunca em broadcast)">
              START em todos
            </Button>
          </div>
          <ul className={styles.pointList}>
            {robots.map((r) => (
              <li key={r.address}>
                <span>
                  {r.label} {SimRobotMapper.shortAddress(r.address)}
                </span>
                <span>
                  {r.otaProgress !== null && `flash ${Math.round(r.otaProgress * 100)}% `}
                  {r.device ? (
                    <Badge tone={STATUS_TONE[r.device.status]}>{swarmitStatusName(r.device.status)}</Badge>
                  ) : (
                    '—'
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

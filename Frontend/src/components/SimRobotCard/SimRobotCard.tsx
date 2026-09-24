import type { MouseEvent } from 'react';
import { Badge } from '../Badge/Badge';
import type { BadgeTone } from '../Badge/Badge';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { SwarmitDeviceStatus } from '../../enums/SwarmitDeviceStatus.enum';
import { swarmitStatusName } from '../../Integration/Protocols/Swarmit/Swarmit.Protocol';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import type { SimRobotRowModel } from '../../model/SimRobot.Model';
import styles from './SimRobotCard.module.css';

const BACKEND_LABEL: Record<RobotStatus, string> = {
  [RobotStatus.Active]: 'Active',
  [RobotStatus.Inactive]: 'Inactive',
  [RobotStatus.Lost]: 'Lost',
};

const BACKEND_TONE: Record<RobotStatus, BadgeTone> = {
  [RobotStatus.Active]: 'green',
  [RobotStatus.Inactive]: 'yellow',
  [RobotStatus.Lost]: 'red',
};

interface SimRobotCardProps {
  robot: SimRobotRowModel;
  selected: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

// Cartão compacto de um robô — mesmos campos do Inspector do
// RobotSwarmSimulator (pose, modo, bateria, rota, estado na rede) + o que o
// backend local enxerga (Active/Inactive/Lost). Clique seleciona no mapa
// (Ctrl/Cmd+clique soma); o detalhe e os comandos ficam no drawer.
export function SimRobotCard({ robot, selected, onClick }: SimRobotCardProps) {
  const { sim } = robot;
  const battery = Math.max(0, Math.min(100, robot.battery));

  return (
    <button type="button" className={`${styles.card} ${selected ? styles.selected : ''}`} onClick={onClick}>
      <div className={styles.header}>
        <span className={styles.chip} style={{ background: robot.color }}>
          {robot.label}
        </span>
        <span className={styles.address} title={robot.address}>
          {SimRobotMapper.shortAddress(robot.address)}
        </span>
        <span className={styles.mode}>{robot.modeLabel}</span>
      </div>

      {sim && (
        <div className={styles.badges}>
          <Badge tone={sim.online ? 'green' : 'red'} title="Estado na rede Mari (lado do simulador)">
            {sim.online ? 'ONLINE' : 'OFFLINE'}
          </Badge>
          {sim.swarmitStatus !== null && (
            <Badge tone={sim.swarmitStatus === SwarmitDeviceStatus.Running ? 'dark' : 'blue'} title="Estado swarmit do dispositivo">
              {swarmitStatusName(sim.swarmitStatus)}
            </Badge>
          )}
          <Badge
            tone={sim.backendStatus !== null ? BACKEND_TONE[sim.backendStatus] : 'muted'}
            title="Status que o backend calcula pelo último DOTBOT_ADVERTISEMENT (5 s → Inactive, 60 s → Lost)"
          >
            API: {sim.backendStatus !== null ? BACKEND_LABEL[sim.backendStatus] : '—'}
          </Badge>
          {sim.taskName && (
            <Badge tone="blue" title="Task em andamento (orquestrador do backend local)">
              tarefa: {sim.taskName}
            </Badge>
          )}
        </div>
      )}

      <div className={styles.line}>
        <span>pose</span>
        <span>
          x={robot.x.toFixed(0)} y={robot.y.toFixed(0)} · {robot.thetaDeg.toFixed(0)}°
        </span>
      </div>

      <div className={styles.line}>
        <span className={styles.battery} title={`Bateria ${battery.toFixed(1)}%`}>
          <span
            className={styles.batteryFill}
            style={{
              width: `${battery}%`,
              background: battery > 50 ? 'var(--color-green)' : battery > 20 ? 'var(--color-yellow)' : 'var(--color-red)',
            }}
          />
        </span>
        <span>{battery.toFixed(1)}%</span>
        <span>
          {robot.waypoints > 0
            ? `rota ${robot.waypointIdx !== null ? `${Math.min(robot.waypointIdx, robot.waypoints)}/` : ''}${robot.waypoints}${robot.loop ? ' ⟳' : ''}`
            : 'sem rota'}
        </span>
      </div>
    </button>
  );
}

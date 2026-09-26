import type { MouseEvent } from 'react';
import { Badge } from '../Badge/Badge';
import type { BadgeTone } from '../Badge/Badge';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import type { VisRobotRowModel } from '../../model/VisRobot.Model';
import styles from './VisRobotCard.module.css';

const STATUS_TONE: Record<RobotStatus, BadgeTone> = {
  [RobotStatus.Active]: 'green',
  [RobotStatus.Inactive]: 'yellow',
  [RobotStatus.Lost]: 'red',
};

interface VisRobotCardProps {
  robot: VisRobotRowModel;
  selected: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

// Cartão compacto de um robô da API — o mesmo desenho do SimRobotCard da
// Simulação, com o que a API informa: status calculado pelo backend, modo de
// orquestração, tarefa, pose e bateria do último advertisement.
export function VisRobotCard({ robot, selected, onClick }: VisRobotCardProps) {
  const battery = Math.max(0, Math.min(100, robot.battery));

  return (
    <button type="button" className={`${styles.card} ${selected ? styles.selected : ''}`} onClick={onClick}>
      <div className={styles.header}>
        <span className={styles.chip} style={{ background: robot.color }}>
          {robot.label}
        </span>
        <span className={styles.address} title={`${robot.name} · ${robot.address}`}>
          {SimRobotMapper.shortAddress(robot.address)}
        </span>
        <span className={styles.mode} title="Modo de orquestração (coluna mode da API)">
          {robot.modeLabel}
        </span>
      </div>

      <div className={styles.badges}>
        <Badge tone={STATUS_TONE[robot.status]} title="Status que o backend calcula pelo último DOTBOT_ADVERTISEMENT (5 s → Inactive, 60 s → Lost)">
          API: {SimRobotMapper.statusLabel(robot.status)}
        </Badge>
        {robot.taskName && (
          <Badge tone="blue" title="Tarefa atribuída pelo orquestrador do backend">
            tarefa: {robot.taskName}
          </Badge>
        )}
        {robot.outside && (
          <Badge tone="yellow" title="A posição do robô está fora da arena do cenário escolhido — o marcador fica na borda">
            fora do mapa
          </Badge>
        )}
      </div>

      <div className={styles.line}>
        <span>pose</span>
        <span>
          {robot.pose
            ? `x=${robot.pose.x.toFixed(0)} y=${robot.pose.y.toFixed(0)} · ${robot.pose.thetaDeg.toFixed(0)}°`
            : robot.wireAuto === null
              ? 'sem telemetria'
              : 'sem localização'}
        </span>
      </div>

      <div className={styles.line}>
        <span className={styles.battery} title={`Bateria ${battery}%`}>
          <span
            className={styles.batteryFill}
            style={{
              width: `${battery}%`,
              background: battery > 50 ? 'var(--color-green)' : battery > 20 ? 'var(--color-yellow)' : 'var(--color-red)',
            }}
          />
        </span>
        <span>{battery}%</span>
        <span title="Modo no fio (último advertisement)">
          {robot.wireAuto === null ? '—' : robot.wireAuto ? `rota · wp ${robot.waypointIdx ?? 0}` : 'sem rota'}
        </span>
      </div>
    </button>
  );
}

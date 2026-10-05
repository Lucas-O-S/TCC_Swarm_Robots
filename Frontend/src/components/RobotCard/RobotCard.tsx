import type { MouseEvent, ReactNode } from 'react';
import { Badge } from '../Badge/Badge';
import type { BadgeTone } from '../Badge/Badge';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import styles from './RobotCard.module.css';

/** O que um cartão de robô mostra — cada tela monta a partir do seu modelo (ver SimRobotList e VisRobotList). */
export interface RobotCardData {
  address: string;
  label: string;
  color: string;
  /** Tooltip do endereço (padrão: o próprio address). */
  addressTitle?: string;
  modeLabel: string;
  modeTitle?: string;
  /** Etiquetas de estado (ONLINE, API: Active, tarefa…). */
  badges?: ReactNode;
  pose: string;
  /** Bateria em %, 0–100 (pinta a barra). */
  battery: number;
  /** Texto ao lado da barra (ex.: "79%"). */
  batteryText: string;
  routeText: string;
  routeTitle?: string;
}

interface RobotCardProps extends RobotCardData {
  selected: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

// Cartão compacto de um robô nas listas do menu (Simulação e Visualizador):
// chip com rótulo e cor, endereço curto, modo, etiquetas, pose e bateria.
// Clique seleciona no mapa (Ctrl/Cmd+clique soma); o detalhe fica no drawer.
export function RobotCard({
  address,
  label,
  color,
  addressTitle,
  modeLabel,
  modeTitle,
  badges,
  pose,
  battery,
  batteryText,
  routeText,
  routeTitle,
  selected,
  onClick,
}: RobotCardProps) {
  const pct = Math.max(0, Math.min(100, battery));

  return (
    <button type="button" className={`${styles.card} ${selected ? styles.selected : ''}`} onClick={onClick}>
      <div className={styles.header}>
        <span className={styles.chip} style={{ background: color }}>
          {label}
        </span>
        <span className={styles.address} title={addressTitle ?? address}>
          {SimRobotMapper.shortAddress(address)}
        </span>
        <span className={styles.mode} title={modeTitle}>
          {modeLabel}
        </span>
      </div>

      {badges && <div className={styles.badges}>{badges}</div>}

      <div className={styles.line}>
        <span>pose</span>
        <span>{pose}</span>
      </div>

      <div className={styles.line}>
        <span className={styles.battery} title={`Bateria ${batteryText}`}>
          <span
            className={styles.batteryFill}
            style={{
              width: `${pct}%`,
              background: pct > 50 ? 'var(--color-green)' : pct > 20 ? 'var(--color-yellow)' : 'var(--color-red)',
            }}
          />
        </span>
        <span>{batteryText}</span>
        <span title={routeTitle}>{routeText}</span>
      </div>
    </button>
  );
}

const STATUS_TONE: Record<RobotStatus, BadgeTone> = {
  [RobotStatus.Active]: 'green',
  [RobotStatus.Inactive]: 'yellow',
  [RobotStatus.Lost]: 'red',
};

/** Etiqueta do status que o backend calcula pelo último DOTBOT_ADVERTISEMENT (null = ainda não cadastrado). */
export function RobotStatusBadge({ status }: { status: RobotStatus | null }) {
  return (
    <Badge
      tone={status !== null ? STATUS_TONE[status] : 'muted'}
      title="Status que o backend calcula pelo último DOTBOT_ADVERTISEMENT (5 s → Inactive, 60 s → Lost)"
    >
      API: {status !== null ? SimRobotMapper.statusLabel(status) : '—'}
    </Badge>
  );
}

/** Etiqueta da tarefa em andamento no orquestrador. */
export function RobotTaskBadge({ name }: { name: string }) {
  return (
    <Badge tone="blue" title="Tarefa em andamento (orquestrador)">
      tarefa: {name}
    </Badge>
  );
}

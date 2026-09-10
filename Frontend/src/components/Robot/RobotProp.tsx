import type { HTMLAttributes } from 'react';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import styles from './Robot.module.css';

interface RobotProps extends HTMLAttributes<HTMLDivElement> {
  /** Active/Inactive/Lost (ver src/enums/RobotStatus.enum.ts) — controla a cor do marcador. */
  status?: RobotStatus;
  /** Nome/ID do robô (ex.: "R01") — vira legenda dentro do marcador e tooltip. */
  label?: string;
  /** Destaque visual (robô selecionado, quando a tela que usar este componente tiver seleção). */
  selected?: boolean;
}

const STATUS_CLASS: Record<RobotStatus, string> = {
  [RobotStatus.Active]: 'active',
  [RobotStatus.Inactive]: 'inactive',
  [RobotStatus.Lost]: 'lost',
};

// Marcador visual de um robô — só a "carinha" (círculo colorido por status +
// legenda), sem posição própria, sem hook e sem dado vindo de API. Quem usar
// este componente decide onde colocá-lo (ex.: dentro de <Map>, numa lista,
// num cartão) via className/style — passam direto por causa do spread de
// HTMLAttributes.
export function Robot({
  status = RobotStatus.Inactive,
  label,
  selected = false,
  className = '',
  ...rest
}: RobotProps) {
  const statusClass = styles[STATUS_CLASS[status]] ?? '';

  return (
    <div
      className={`${styles.robot} ${statusClass} ${selected ? styles.selected : ''} ${className}`}
      title={label}
      {...rest}
    >
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}

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
  /**
   * Orientação do robô em graus (0° = apontando pra cima, sentido horário) —
   * mesmo `theta` usado em screens/simulator/ui/components/SimulationMap.tsx.
   * Desenha uma seta indicando pra onde o robô está apontando, sem girar o
   * label (ao contrário do robô do simulador, este tem texto dentro).
   */
  direction?: number;
}

const STATUS_CLASS: Record<RobotStatus, string> = {
  [RobotStatus.Active]: 'active',
  [RobotStatus.Inactive]: 'inactive',
  [RobotStatus.Lost]: 'lost',
};

// Marcador visual de um robô — só a "carinha" (círculo colorido por status +
// legenda), sem hook e sem dado vindo de API. Quem usar este componente
// decide onde colocá-lo (ex.: dentro de <Map>, numa lista, num cartão) via
// className/style — passam direto por causa do spread de HTMLAttributes.
// O próprio marcador já vem ancorado pelo centro (transform: translate(-50%,
// -50%) em Robot.module.css), então basta passar left/top do ponto exato.
export function Robot({
  status = RobotStatus.Inactive,
  label,
  selected = false,
  direction,
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
      {typeof direction === 'number' && (
        <span className={styles.direction} style={{ transform: `rotate(${direction}deg)` }} />
      )}
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}

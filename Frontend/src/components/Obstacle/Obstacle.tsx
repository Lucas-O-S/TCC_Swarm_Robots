import type { HTMLAttributes } from 'react';
import { useMapElement } from '../../hooks/useMapElements';
import styles from './Obstacle.module.css';

interface ObstacleProps extends Omit<HTMLAttributes<HTMLDivElement>, 'id'> {
  /** Sem id, o obstáculo é só decorativo (ex.: preview de criação) — não participa de seleção/movimento/remoção. */
  id?: string;
  /** Posição (px) dentro do mapa — o componente cuida do resto do `style` (inclusive durante um arrasto). */
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  /** Participa de clique/Ctrl+clique/seleção em área. Default true (quando `id` existe). */
  selectable?: boolean;
  /** Arrastar move o obstáculo (e o resto do grupo selecionado) — chama `onMove` com a posição final (px). */
  movable?: boolean;
  onMove?: (next: { x: number; y: number }) => void;
  /** Participa de Backspace/Delete quando selecionado — chama `onRemove`. */
  removable?: boolean;
  onRemove?: () => void;
}

// Obstáculo do mapa — "deriva" da entidade compartilhada de seleção/
// movimento (ver src/hooks/useMapElements.tsx) via id/selectable/movable/
// removable: quem renderiza não precisa ligar nenhum handler de pointer,
// só decidir quais capacidades esse obstáculo tem.
export function Obstacle({
  id,
  x,
  y,
  width,
  height,
  label,
  selectable = true,
  movable = false,
  onMove,
  removable = false,
  onRemove,
  className = '',
  style,
  ...rest
}: ObstacleProps) {
  const { selected, x: renderX, y: renderY } = useMapElement({
    id,
    x,
    y,
    width,
    height,
    selectable,
    movable,
    onMove,
    removable,
    onRemove,
  });

  return (
    <div
      className={`${styles.obstacle} ${selected ? styles.selected : ''} ${className}`}
      style={{ position: 'absolute', left: renderX, top: renderY, width, height, ...style }}
      title={label}
      {...rest}
    >
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}

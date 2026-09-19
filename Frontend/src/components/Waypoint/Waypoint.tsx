import type { HTMLAttributes } from 'react';
import { useMapElement } from '../../hooks/useMapElements';
import styles from './Waypoint.module.css';

interface WaypointProps extends Omit<HTMLAttributes<HTMLDivElement>, 'id'> {
  /** Sem id, o waypoint é só decorativo (ex.: preview de criação) — não participa de seleção/movimento/remoção. */
  id?: string;
  /** Centro do marcador (px) dentro do mapa — diferente de <Obstacle>, aqui x/y são o CENTRO, não o canto (um ponto não tem canto). */
  x: number;
  y: number;
  /** Diâmetro do marcador (px) — também o tamanho da área clicável/arrastável. */
  size?: number;
  /** Número de ordem da rota (1-based), exibido dentro do marcador. */
  order?: number;
  /** Cor do marcador — default verde (rota). Ex.: amarelo pra distinguir os pontos de uma área/bloco da rota em si (mesmo sistema, cor diferente). */
  color?: string;
  /** Participa de clique/Ctrl+clique/seleção em área. Default true (quando `id` existe). */
  selectable?: boolean;
  /** Arrastar move o waypoint (e o resto do grupo selecionado) — chama `onMove` com o centro final (px). */
  movable?: boolean;
  onMove?: (next: { x: number; y: number }) => void;
  /** Participa de Backspace/Delete quando selecionado — chama `onRemove`. */
  removable?: boolean;
  onRemove?: () => void;
}

const DEFAULT_SIZE = 20;

// Ponto de rota de uma task — "deriva" da mesma entidade compartilhada de
// seleção/movimento que <Obstacle> (ver src/hooks/useMapElements.tsx), só
// que redondo, menor, e com `x`/`y` no centro em vez do canto.
export function Waypoint({
  id,
  x,
  y,
  size = DEFAULT_SIZE,
  order,
  color,
  selectable = true,
  movable = false,
  onMove,
  removable = false,
  onRemove,
  className = '',
  style,
  ...rest
}: WaypointProps) {
  const half = size / 2;
  const { selected, x: renderX, y: renderY } = useMapElement({
    id,
    x: x - half,
    y: y - half,
    width: size,
    height: size,
    selectable,
    movable,
    onMove: onMove && ((next) => onMove({ x: next.x + half, y: next.y + half })),
    removable,
    onRemove,
  });

  return (
    <div
      className={`${styles.waypoint} ${selected ? styles.selected : ''} ${className}`}
      style={{
        position: 'absolute',
        left: renderX,
        top: renderY,
        width: size,
        height: size,
        ...(color ? { background: color } : null),
        ...style,
      }}
      {...rest}
    >
      {order != null && <span className={styles.order}>{order}</span>}
    </div>
  );
}

import { Children, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './MenuColumns.module.css';

// Espaço entre colunas e entre cartões — bate com o `gap` de MenuColumns.module.css.
const GAP = 16;

interface MenuColumnsProps {
  /** Os cartões (<Menu>), na ordem de leitura; `false`/`null` (cartão escondido) é ignorado. */
  children: ReactNode;
  /** Largura mínima de cada coluna (px) — quantas cabem decide o número de colunas. */
  minColumnWidth?: number;
  className?: string;
}

// Vários <Menu> lado a lado, na mesma regra do `repeat(auto-fill, minmax(300px, 1fr))`
// (quantas colunas couberem), mas cada coluna empilha os próprios cartões: um
// cartão baixo não fica com um buraco embaixo por causa do vizinho mais alto,
// como acontecia na grade (que alinha por linha). Os cartões são distribuídos
// na ordem, alternando as colunas — a mesma posição que tinham na grade.
export function MenuColumns({ children, minColumnWidth = 300, className = '' }: MenuColumnsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setCount(Math.max(1, Math.floor((el.clientWidth + GAP) / (minColumnWidth + GAP))));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [minColumnWidth]);

  // toArray já descarta false/null e dá a cada cartão uma key pela posição original.
  const cards = Children.toArray(children);
  const columns = Array.from({ length: count }, (_, col) => cards.filter((_, i) => i % count === col));

  return (
    <div ref={ref} className={`${styles.columns} ${className}`} style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      {columns.map((column, col) => (
        <div key={col} className={styles.column}>
          {column}
        </div>
      ))}
    </div>
  );
}

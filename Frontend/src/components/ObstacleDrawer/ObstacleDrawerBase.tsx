import type { ReactNode } from 'react';
import { useMapSelection } from '../../hooks/useMapElements';
import { Drawer } from '../Drawer/Drawer';
import { Button } from '../Button/Button';
import styles from './ObstacleDrawer.module.css';

export interface ObstacleDrawerLabels {
  /** Título com 1 selecionado (ex.: "Obstáculo"). */
  one: string;
  /** Plural do título com vários (ex.: "obstáculos" → "3 obstáculos"). */
  many: string;
  /** Botão de remover com vários selecionados. */
  removeMany: string;
}

interface ObstacleDrawerBaseProps<T> {
  /** Todos os obstáculos — o drawer filtra sozinho quem está selecionado (ver useMapSelection). */
  allObstacles: T[];
  /** Id do obstáculo no registro de seleção do mapa. */
  selectionId: (obstacle: T) => string;
  /** Nome no resumo da seleção múltipla. */
  nameOf: (obstacle: T) => string;
  labels: ObstacleDrawerLabels;
  /** Campos com exatamente 1 selecionado — cada tela tem os seus (e o próprio botão de remover). */
  renderSingle: (obstacle: T, remove: () => void) => ReactNode;
}

// Base dos drawers de obstáculo — o ObstacleDrawer (CenarioBuilder, em
// células) e o SimObstacleDrawer (Simulação, em mm): acha os selecionados
// via useMapSelection, monta o título e trata a seleção múltipla (resumo +
// remover todos). Os campos de 1 obstáculo ficam com cada tela, porque o
// modelo muda. Precisa ser passado via <MapCanvas panel={...}>.
export function ObstacleDrawerBase<T>({ allObstacles, selectionId, nameOf, labels, renderSingle }: ObstacleDrawerBaseProps<T>) {
  const { selectedIds, clear, removeSelected } = useMapSelection();
  const obstacles = allObstacles.filter((o) => selectedIds.has(selectionId(o)));
  const single = obstacles.length === 1 ? obstacles[0] : null;
  const title = obstacles.length > 1 ? `${obstacles.length} ${labels.many}` : labels.one;

  return (
    <Drawer open={obstacles.length > 0} onClose={clear} title={title}>
      {single !== null && renderSingle(single, removeSelected)}

      {obstacles.length > 1 && (
        <>
          <p className={styles.summary}>{obstacles.map(nameOf).join(', ')}</p>
          <Button variant="outline" onClick={removeSelected}>
            {labels.removeMany}
          </Button>
        </>
      )}
    </Drawer>
  );
}

import type { ChangeEvent } from 'react';
import { Button } from '../Button/Button';
import { ObstacleDrawerBase } from '../ObstacleDrawer/ObstacleDrawerBase';
import type { ScenarioObstacleModel } from '../../model/Scenario.Model';
import { useCommitField } from '../../screens/Simulation/useCommitField';
import { obstacleSelId } from '../../screens/Simulation/useSimSelection';
import styles from './SimObstacleDrawer.module.css';

interface SimObstacleDrawerProps {
  /** Barreiras do cenário — o drawer filtra sozinho as selecionadas (useMapSelection), como o ObstacleDrawer. */
  obstacles: ScenarioObstacleModel[];
  onPatch: (id: string, patch: Partial<ScenarioObstacleModel>) => void;
  /** Devolve a mensagem de erro, ou null se o id foi aceito. */
  onRename: (id: string, next: string) => string | null;
}

// Painel da barreira selecionada no modo Editar — mesmo papel do
// ObstacleDrawer do CenarioBuilder, só que em mm (o cenário do simulador).
// Precisa ser passado via <MapCanvas panel={...}> pra enxergar a seleção.
export function SimObstacleDrawer({ obstacles, onPatch, onRename }: SimObstacleDrawerProps) {
  return (
    <ObstacleDrawerBase
      allObstacles={obstacles}
      selectionId={(o) => obstacleSelId(o.id)}
      nameOf={(o) => o.id}
      labels={{ one: 'Barreira', many: 'barreiras', removeMany: 'Remover selecionadas' }}
      renderSingle={(single, remove) => (
        <ObstacleForm key={single.id} obstacle={single} onPatch={onPatch} onRename={onRename} onRemove={remove} />
      )}
    />
  );
}

function ObstacleForm({
  obstacle,
  onPatch,
  onRename,
  onRemove,
}: {
  obstacle: ScenarioObstacleModel;
  onPatch: SimObstacleDrawerProps['onPatch'];
  onRename: SimObstacleDrawerProps['onRename'];
  onRemove: () => void;
}) {
  const name = useCommitField(obstacle.id, (next) => onRename(obstacle.id, next.trim()));

  function field(key: 'x_mm' | 'y_mm' | 'w_mm' | 'h_mm', min: number) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      if (Number.isFinite(v) && v >= min) onPatch(obstacle.id, { [key]: v });
    };
  }

  return (
    <div className={styles.section}>
      <label className={styles.field}>
        Nome (id)
        <input type="text" value={name.value} onChange={(e) => name.setValue(e.target.value)} onBlur={name.onBlur} onKeyDown={name.onKeyDown} />
      </label>
      {name.error && <p className={styles.error}>{name.error}</p>}

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          x (mm)
          <input type="number" step={50} value={obstacle.x_mm} onChange={field('x_mm', -Infinity)} />
        </label>
        <label className={styles.field}>
          y (mm)
          <input type="number" step={50} value={obstacle.y_mm} onChange={field('y_mm', -Infinity)} />
        </label>
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.field}>
          Largura (mm)
          <input type="number" min={20} step={50} value={obstacle.w_mm} onChange={field('w_mm', 20)} />
        </label>
        <label className={styles.field}>
          Altura (mm)
          <input type="number" min={20} step={50} value={obstacle.h_mm} onChange={field('h_mm', 20)} />
        </label>
      </div>
      <p className={styles.hint}>x/y = canto inferior-esquerdo (Y cresce pra cima, como no simulador).</p>

      <Button variant="outline" onClick={onRemove}>
        Remover barreira
      </Button>
    </div>
  );
}

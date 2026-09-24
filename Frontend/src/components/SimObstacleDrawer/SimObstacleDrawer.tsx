import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../Button/Button';
import { Drawer } from '../Drawer/Drawer';
import { useMapSelection } from '../../hooks/useMapElements';
import type { ScenarioObstacleModel } from '../../model/Scenario.Model';
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
  const { selectedIds, clear, removeSelected } = useMapSelection();
  const selected = obstacles.filter((o) => selectedIds.has(obstacleSelId(o.id)));
  const single = selected.length === 1 ? selected[0] : null;
  const title = selected.length > 1 ? `${selected.length} barreiras` : 'Barreira';

  return (
    <Drawer open={selected.length > 0} onClose={clear} title={title}>
      {single && <ObstacleForm key={single.id} obstacle={single} onPatch={onPatch} onRename={onRename} onRemove={removeSelected} />}
      {selected.length > 1 && (
        <div className={styles.section}>
          <p className={styles.hint}>{selected.map((o) => o.id).join(', ')}</p>
          <Button variant="outline" onClick={removeSelected}>
            Remover selecionadas
          </Button>
        </div>
      )}
    </Drawer>
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
  const [id, setId] = useState(obstacle.id);
  const [error, setError] = useState<string | null>(null);

  function commitId() {
    if (id === obstacle.id) return;
    const err = onRename(obstacle.id, id.trim());
    setError(err);
    if (err) setId(obstacle.id);
  }

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
        <input type="text" value={id} onChange={(e) => setId(e.target.value)} onBlur={commitId} onKeyDown={(e) => e.key === 'Enter' && commitId()} />
      </label>
      {error && <p className={styles.error}>{error}</p>}

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

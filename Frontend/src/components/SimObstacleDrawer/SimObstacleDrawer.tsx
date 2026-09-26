import type { ChangeEvent } from 'react';
import { Button } from '../Button/Button';
import { DrawerBody, DrawerError, DrawerField, DrawerHint, DrawerRow } from '../Drawer/DrawerForm';
import { ObstacleDrawerBase } from '../ObstacleDrawer/ObstacleDrawerBase';
import type { ScenarioObstacleModel } from '../../model/Scenario.Model';
import { useCommitField } from '../../screens/Simulation/useCommitField';
import { obstacleSelId } from '../../screens/Simulation/useSimSelection';

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
    <DrawerBody>
      <DrawerField label="Nome (id)">
        <input type="text" value={name.value} onChange={(e) => name.setValue(e.target.value)} onBlur={name.onBlur} onKeyDown={name.onKeyDown} />
      </DrawerField>
      {name.error && <DrawerError>{name.error}</DrawerError>}

      <DrawerRow>
        <DrawerField label="x (mm)">
          <input type="number" step={50} value={obstacle.x_mm} onChange={field('x_mm', -Infinity)} />
        </DrawerField>
        <DrawerField label="y (mm)">
          <input type="number" step={50} value={obstacle.y_mm} onChange={field('y_mm', -Infinity)} />
        </DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Largura (mm)">
          <input type="number" min={20} step={50} value={obstacle.w_mm} onChange={field('w_mm', 20)} />
        </DrawerField>
        <DrawerField label="Altura (mm)">
          <input type="number" min={20} step={50} value={obstacle.h_mm} onChange={field('h_mm', 20)} />
        </DrawerField>
      </DrawerRow>
      <DrawerHint>x/y = canto inferior-esquerdo (Y cresce pra cima, como no simulador).</DrawerHint>

      <Button variant="outline" onClick={onRemove}>
        Remover barreira
      </Button>
    </DrawerBody>
  );
}

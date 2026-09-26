import type { ChangeEvent } from 'react';
import type { ObstaclesModel } from '../../model/Obstacles.Model';
import { ObstacleDrawerBase } from './ObstacleDrawerBase';
import { Button } from '../Button/Button';
import { DrawerBody, DrawerField, DrawerRow } from '../Drawer/DrawerForm';

interface ObstacleDrawerProps {
  /** Todos os obstáculos do cenário — o drawer filtra sozinho quem está selecionado (ver useMapSelection). */
  allObstacles: ObstaclesModel[];
  /** Só chamado com exatamente 1 selecionado (editar campos de vários de uma vez não faz sentido aqui) — o drawer já resolve o id, a tela só aplica o patch. */
  onChange: (id: string, patch: Partial<ObstaclesModel>) => void;
}

// Painel de edição da seleção de obstáculos no grid (ferramentas
// "Selecionar" e "Obstáculo" — clique simples seleciona um, Ctrl/Cmd+clique
// ou arrastar em área seleciona vários; ver useMapElements/useMapSelection,
// a mesma seleção que os próprios <Obstacle> usam). Fica montado mesmo sem
// nada selecionado pra manter a transição de slide do <Drawer>; o conteúdo
// some junto. Precisa ser passado via <MapCanvas panel={...}> — é onde
// useMapSelection() consegue enxergar o contexto de seleção do mapa.
export function ObstacleDrawer({ allObstacles, onChange }: ObstacleDrawerProps) {
  return (
    <ObstacleDrawerBase
      allObstacles={allObstacles}
      selectionId={(o) => o.id}
      nameOf={(o) => o.name}
      labels={{ one: 'Obstáculo', many: 'obstáculos', removeMany: 'Remover selecionados' }}
      renderSingle={(single, remove) => (
        <ObstacleFields obstacle={single} onChange={(patch) => onChange(single.id, patch)} onRemove={remove} />
      )}
    />
  );
}

function ObstacleFields({
  obstacle,
  onChange,
  onRemove,
}: {
  obstacle: ObstaclesModel;
  onChange: (patch: Partial<ObstaclesModel>) => void;
  onRemove: () => void;
}) {
  function handleNumberChange(field: 'sizeX' | 'sizeY') {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (!Number.isNaN(value)) onChange({ [field]: value });
    };
  }

  return (
    <DrawerBody>
      <DrawerField label="Nome">
        <input type="text" value={obstacle.name} onChange={(e) => onChange({ name: e.target.value })} />
      </DrawerField>

      <DrawerField label="Descrição">
        <textarea value={obstacle.description} onChange={(e) => onChange({ description: e.target.value })} />
      </DrawerField>

      <DrawerRow>
        <DrawerField label="Largura (colunas)">
          <input type="number" min={1} value={obstacle.sizeX} onChange={handleNumberChange('sizeX')} />
        </DrawerField>

        <DrawerField label="Altura (linhas)">
          <input type="number" min={1} value={obstacle.sizeY} onChange={handleNumberChange('sizeY')} />
        </DrawerField>
      </DrawerRow>

      <Button variant="outline" onClick={onRemove}>
        Remover obstáculo
      </Button>
    </DrawerBody>
  );
}

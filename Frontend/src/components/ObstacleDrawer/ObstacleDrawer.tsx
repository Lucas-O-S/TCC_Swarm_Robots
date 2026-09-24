import type { ChangeEvent } from 'react';
import type { ObstaclesModel } from '../../model/Obstacles.Model';
import { ObstacleDrawerBase } from './ObstacleDrawerBase';
import { Button } from '../Button/Button';
import styles from './ObstacleDrawer.module.css';

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
    <>
      <label className={styles.field}>
        Nome
        <input type="text" value={obstacle.name} onChange={(e) => onChange({ name: e.target.value })} />
      </label>

      <label className={styles.field}>
        Descrição
        <textarea value={obstacle.description} onChange={(e) => onChange({ description: e.target.value })} />
      </label>

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          Largura (colunas)
          <input type="number" min={1} value={obstacle.sizeX} onChange={handleNumberChange('sizeX')} />
        </label>

        <label className={styles.field}>
          Altura (linhas)
          <input type="number" min={1} value={obstacle.sizeY} onChange={handleNumberChange('sizeY')} />
        </label>
      </div>

      <Button variant="outline" onClick={onRemove}>
        Remover obstáculo
      </Button>
    </>
  );
}

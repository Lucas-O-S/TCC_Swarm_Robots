import type { ChangeEvent } from 'react';
import type { ObstaclesModel } from '../../model/Obstacles.Model';
import { useMapSelection } from '../../hooks/useMapElements';
import { Drawer } from '../Drawer/Drawer';
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
  const { selectedIds, clear, removeSelected } = useMapSelection();
  const obstacles = allObstacles.filter((o) => selectedIds.has(o.id));
  const single = obstacles.length === 1 ? obstacles[0] : null;

  function handleSingleChange(patch: Partial<ObstaclesModel>) {
    if (single) onChange(single.id, patch);
  }

  function handleNumberChange(field: 'sizeX' | 'sizeY') {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (!Number.isNaN(value)) handleSingleChange({ [field]: value });
    };
  }

  const title = obstacles.length > 1 ? `${obstacles.length} obstáculos` : 'Obstáculo';

  return (
    <Drawer open={obstacles.length > 0} onClose={clear} title={title}>
      {single && (
        <>
          <label className={styles.field}>
            Nome
            <input type="text" value={single.name} onChange={(e) => handleSingleChange({ name: e.target.value })} />
          </label>

          <label className={styles.field}>
            Descrição
            <textarea value={single.description} onChange={(e) => handleSingleChange({ description: e.target.value })} />
          </label>

          <div className={styles.fieldRow}>
            <label className={styles.field}>
              Largura (colunas)
              <input type="number" min={1} value={single.sizeX} onChange={handleNumberChange('sizeX')} />
            </label>

            <label className={styles.field}>
              Altura (linhas)
              <input type="number" min={1} value={single.sizeY} onChange={handleNumberChange('sizeY')} />
            </label>
          </div>

          <Button variant="outline" onClick={removeSelected}>
            Remover obstáculo
          </Button>
        </>
      )}

      {obstacles.length > 1 && (
        <>
          <p className={styles.summary}>
            {obstacles.map((o) => o.name).join(', ')}
          </p>
          <Button variant="outline" onClick={removeSelected}>
            Remover selecionados
          </Button>
        </>
      )}
    </Drawer>
  );
}

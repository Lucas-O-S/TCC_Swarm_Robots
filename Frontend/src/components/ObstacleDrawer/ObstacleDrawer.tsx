import type { ChangeEvent } from 'react';
import type { ObstaclesModel } from '../../model/Obstacles.Model';
import { Drawer } from '../Drawer/Drawer';
import { Button } from '../Button/Button';
import styles from './ObstacleDrawer.module.css';

interface ObstacleDrawerProps {
  /** 0 = fechado, 1 = formulário completo, 2+ = resumo + remoção em lote. */
  obstacles: ObstaclesModel[];
  /** Só tem efeito quando `obstacles.length === 1` (editar campos de vários de uma vez não faz sentido aqui). */
  onChangeSingle: (patch: Partial<ObstaclesModel>) => void;
  onRemove: () => void;
  onClose: () => void;
}

// Painel de edição da seleção de obstáculos no grid (ferramentas
// "Selecionar" e "Obstáculo" — clique simples seleciona um, Ctrl/Cmd+clique
// ou arrastar em área seleciona vários; ver useObstacleEditor). Fica
// montado mesmo sem nada selecionado pra manter a transição de slide do
// <Drawer>; o conteúdo some junto.
export function ObstacleDrawer({ obstacles, onChangeSingle, onRemove, onClose }: ObstacleDrawerProps) {
  const single = obstacles.length === 1 ? obstacles[0] : null;

  function handleNumberChange(field: 'sizeX' | 'sizeY') {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (!Number.isNaN(value)) onChangeSingle({ [field]: value });
    };
  }

  const title = obstacles.length > 1 ? `${obstacles.length} obstáculos` : 'Obstáculo';

  return (
    <Drawer open={obstacles.length > 0} onClose={onClose} title={title}>
      {single && (
        <>
          <label className={styles.field}>
            Nome
            <input type="text" value={single.name} onChange={(e) => onChangeSingle({ name: e.target.value })} />
          </label>

          <label className={styles.field}>
            Descrição
            <textarea value={single.description} onChange={(e) => onChangeSingle({ description: e.target.value })} />
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

          <Button variant="outline" onClick={onRemove}>
            Remover obstáculo
          </Button>
        </>
      )}

      {obstacles.length > 1 && (
        <>
          <p className={styles.summary}>
            {obstacles.map((o) => o.name).join(', ')}
          </p>
          <Button variant="outline" onClick={onRemove}>
            Remover selecionados
          </Button>
        </>
      )}
    </Drawer>
  );
}

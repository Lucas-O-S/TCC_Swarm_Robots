import type { ChangeEvent } from 'react';
import type { TaskWaypointDraft } from '../../screens/TaskBuilder/useTaskEditor';
import { useMapSelection } from '../../hooks/useMapElements';
import { Drawer } from '../Drawer/Drawer';
import { Button } from '../Button/Button';
import styles from './WaypointDrawer.module.css';

interface WaypointDrawerProps {
  /** Todos os waypoints da rota — o drawer filtra sozinho quem está selecionado (ver useMapSelection). */
  allWaypoints: TaskWaypointDraft[];
  /** Só chamado com exatamente 1 selecionado (editar coordenadas de vários de uma vez não faz sentido aqui). */
  onChange: (id: string, patch: Partial<Pick<TaskWaypointDraft, 'x' | 'y'>>) => void;
  /** Posição (1-based) de cada waypoint na rota inteira — necessário quando a rota mistura outras paradas (ex.: blocos) entre os waypoints. Default: a posição em `allWaypoints`. */
  orderById?: Map<string, number>;
}

// Painel de edição da seleção de waypoints no grid (mesmo padrão do
// ObstacleDrawer) — precisa ser passado via <MapCanvas panel={...}>, é onde
// useMapSelection() enxerga o contexto de seleção do mapa.
export function WaypointDrawer({ allWaypoints, onChange, orderById: orderByIdProp }: WaypointDrawerProps) {
  const { selectedIds, clear, removeSelected } = useMapSelection();
  const orderById = orderByIdProp ?? new Map(allWaypoints.map((w, index) => [w.id, index + 1]));
  const waypoints = allWaypoints.filter((w) => selectedIds.has(w.id));
  const single = waypoints.length === 1 ? waypoints[0] : null;

  function handleNumberChange(field: 'x' | 'y') {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (!Number.isNaN(value) && single) onChange(single.id, { [field]: value });
    };
  }

  const title = waypoints.length > 1 ? `${waypoints.length} waypoints` : 'Waypoint';

  return (
    <Drawer open={waypoints.length > 0} onClose={clear} title={title}>
      {single && (
        <>
          <p className={styles.summary}>{orderById.get(single.id)}ª parada da rota</p>

          <div className={styles.fieldRow}>
            <label className={styles.field}>
              Coluna (x)
              <input type="number" min={0} value={single.x} onChange={handleNumberChange('x')} />
            </label>

            <label className={styles.field}>
              Linha (y)
              <input type="number" min={0} value={single.y} onChange={handleNumberChange('y')} />
            </label>
          </div>

          <Button variant="outline" onClick={removeSelected}>
            Remover waypoint
          </Button>
        </>
      )}

      {waypoints.length > 1 && (
        <>
          <p className={styles.summary}>
            {waypoints.map((w) => `${orderById.get(w.id)}ª`).join(', ')}
          </p>
          <Button variant="outline" onClick={removeSelected}>
            Remover selecionados
          </Button>
        </>
      )}
    </Drawer>
  );
}

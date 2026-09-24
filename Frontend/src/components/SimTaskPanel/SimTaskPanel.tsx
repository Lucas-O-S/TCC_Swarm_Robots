import { Badge } from '../Badge/Badge';
import type { BadgeTone } from '../Badge/Badge';
import { TaskStatus } from '../../enums/TaskStatus.enum';
import { ORCHESTRATOR_RUN_S, taskStatusLabel } from '../../Integration/LocalOrchestrator';
import type { TaskModel } from '../../model/Task.Model';
import styles from './SimTaskPanel.module.css';

const STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  [TaskStatus.Pending]: 'yellow',
  [TaskStatus.InProgress]: 'blue',
  [TaskStatus.Completed]: 'green',
  [TaskStatus.Cancelled]: 'muted',
};

interface SimTaskPanelProps {
  tasks: readonly TaskModel[];
  /** address → rótulo do mapa (R1, R2...). */
  robotLabel: (address: string) => string;
  nextRunIn: number;
  freeAuto: number;
  /** Task com a rota em destaque no mapa. */
  selectedId: string | null;
  onSelect: (uuid: string | null) => void;
}

// Cartão "Tarefas" do menu (modo Simular) — só LEITURA e seleção: as tasks
// vêm do backend (GET /tasks; offline, as mock do SimulationService). Criar,
// editar e apagar é da tela Tarefas. Clicar numa task mostra a rota dela no
// mapa; quem distribui é o orquestrador (Auto) ou você pelo drawer (Semi-auto).
export function SimTaskPanel({ tasks, robotLabel, nextRunIn, freeAuto, selectedId, onSelect }: SimTaskPanelProps) {
  const pending = tasks.filter((t) => t.status === TaskStatus.Pending).length;

  return (
    <div className={styles.section}>
      <div className={styles.status} title={`assignPending roda a cada ${ORCHESTRATOR_RUN_S} s (tempo simulado)`}>
        <span className={styles.dot} />
        <span>
          próxima rodada em {nextRunIn.toFixed(1)} s · {pending} pendente(s) · {freeAuto} robô(s) Auto livre(s)
        </span>
      </div>
      <p className={styles.hint}>
        Puxadas do backend (mock enquanto não há API). Clique numa pra ver a rota no mapa; pra atribuir, abra um robô em
        Semi-auto.
      </p>

      {tasks.length === 0 ? (
        <p className={styles.hint}>Nenhuma tarefa cabe neste cenário.</p>
      ) : (
        <ul className={styles.list}>
          {tasks.map((t) => {
            const robot = t.robots[0];
            const selected = t.uuid === selectedId;
            return (
              <li key={t.uuid}>
                <button
                  type="button"
                  className={`${styles.item} ${selected ? styles.selected : ''}`}
                  aria-pressed={selected}
                  onClick={() => onSelect(selected ? null : t.uuid)}
                >
                  <span className={styles.itemTop}>
                    <strong className={styles.name} title={t.name}>
                      {t.name}
                    </strong>
                    <Badge tone={STATUS_TONE[t.status]}>{taskStatusLabel(t.status)}</Badge>
                  </span>
                  <span className={styles.itemBottom}>
                    prioridade {t.priority} · {t.waypoints.length} ponto(s)
                    {robot ? ` · ${robotLabel(robot.address)}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

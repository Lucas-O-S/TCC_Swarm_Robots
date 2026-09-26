import { Badge } from '../Badge/Badge';
import type { BadgeTone } from '../Badge/Badge';
import { TaskStatus } from '../../enums/TaskStatus.enum';
import { ORCHESTRATOR_RUN_S, taskStatusLabel } from '../../Integration/LocalOrchestrator';
import type { TaskModel } from '../../model/Task.Model';
import styles from './VisTaskPanel.module.css';

const STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  [TaskStatus.Pending]: 'yellow',
  [TaskStatus.InProgress]: 'blue',
  [TaskStatus.Completed]: 'green',
  [TaskStatus.Cancelled]: 'muted',
};

interface VisTaskPanelProps {
  tasks: readonly TaskModel[];
  connected: boolean;
  /** Rótulo do mapa (R1, R2…) do robô com a tarefa, ou null. */
  robotOfTask: (taskId: string) => string | null;
  /** Tarefa com a rota em destaque no mapa. */
  selectedId: string | null;
  onSelect: (uuid: string | null) => void;
}

// Cartão "Tarefas" do Visualizador — só LEITURA e seleção, como o
// SimTaskPanel: as tarefas vêm da API (GET /tasks) e quem distribui é o
// orquestrador do backend (Auto) ou você pelo drawer (Semi-auto). Criar e
// editar é da tela Tarefas.
export function VisTaskPanel({ tasks, connected, robotOfTask, selectedId, onSelect }: VisTaskPanelProps) {
  const pending = tasks.filter((t) => t.status === TaskStatus.Pending).length;
  const running = tasks.filter((t) => t.status === TaskStatus.InProgress).length;

  return (
    <div className={styles.section}>
      <div className={styles.status} title={`O orquestrador do backend distribui a fila a cada ${ORCHESTRATOR_RUN_S} s`}>
        <span className={`${styles.dot} ${connected ? styles.dotOn : styles.dotOff}`} />
        <span>
          {pending} pendente(s) · {running} em andamento · fila do backend a cada {ORCHESTRATOR_RUN_S} s
        </span>
      </div>
      <p className={styles.hint}>
        Vêm da API (GET /tasks). Clique numa pra ver a rota no mapa; pra atribuir, abra um robô em Semi-auto.
      </p>

      {tasks.length === 0 ? (
        <p className={styles.hint}>{connected ? 'Nenhuma tarefa na API.' : 'Sem tarefas: elas vêm da API, que está sem conexão.'}</p>
      ) : (
        <ul className={styles.list}>
          {tasks.map((t) => {
            const robot = robotOfTask(t.uuid);
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
                    prioridade {t.priority} · {t.waypoints.length > 0 ? `${t.waypoints.length} ponto(s)` : 'sem pontos na lista'}
                    {robot ? ` · ${robot}` : ''}
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

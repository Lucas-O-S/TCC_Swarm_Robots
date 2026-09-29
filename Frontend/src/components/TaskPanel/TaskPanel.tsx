import type { ReactNode } from 'react';
import { Badge } from '../Badge/Badge';
import type { BadgeTone } from '../Badge/Badge';
import { StatusLine } from '../StatusLine/StatusLine';
import type { StatusTone } from '../StatusLine/StatusLine';
import { TaskStatus } from '../../enums/TaskStatus.enum';
import { taskStatusLabel } from '../../Integration/LocalOrchestrator';
import type { TaskModel } from '../../model/Task.Model';
import styles from './TaskPanel.module.css';

const STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  [TaskStatus.Pending]: 'yellow',
  [TaskStatus.InProgress]: 'blue',
  [TaskStatus.Completed]: 'green',
  [TaskStatus.Cancelled]: 'muted',
};

interface TaskPanelProps {
  tasks: readonly TaskModel[];
  /** Linha de resumo em cima (rodada da fila, pendentes…). */
  summary: ReactNode;
  summaryTitle?: string;
  summaryTone?: StatusTone;
  hint: string;
  emptyText: string;
  /** Rótulo do mapa (R1, R2…) do robô com a tarefa, ou null. */
  robotOf: (task: TaskModel) => string | null;
  /** Tarefa com a rota em destaque no mapa. */
  selectedId: string | null;
  onSelect: (uuid: string | null) => void;
}

// Cartão "Tarefas" do menu (Simulação e Visualizador) — só LEITURA e
// seleção: as tarefas vêm do backend e quem distribui é o orquestrador
// (Auto) ou você pelo drawer do robô (Semi-auto). Criar, editar e apagar é
// da tela Tarefas. Clicar numa tarefa mostra a rota dela no mapa.
export function TaskPanel({
  tasks,
  summary,
  summaryTitle,
  summaryTone = 'on',
  hint,
  emptyText,
  robotOf,
  selectedId,
  onSelect,
}: TaskPanelProps) {
  return (
    <div className={styles.section}>
      <StatusLine tone={summaryTone} title={summaryTitle}>
        {summary}
      </StatusLine>
      <p className={styles.hint}>{hint}</p>

      {tasks.length === 0 ? (
        <p className={styles.hint}>{emptyText}</p>
      ) : (
        <ul className={styles.list}>
          {tasks.map((t) => {
            const robot = robotOf(t);
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
                    prioridade {t.priority} · {t.waypoints.length > 0 ? `${t.waypoints.length} ponto(s)` : 'sem pontos'}
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

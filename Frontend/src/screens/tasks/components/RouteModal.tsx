import { useState } from 'react';
import type { Task, TaskRoute } from '../types';
import { EMPTY_ROUTE } from '../types';
import { Button } from '../../../components/Button/Button';
import { RouteEditor } from './RouteEditor';
import styles from './RouteModal.module.css';

interface RouteModalProps {
  task: Task;
  onSave: (route: TaskRoute) => void;
  onClose: () => void;
}

// Modal de edição da rota/área de uma tarefa já existente (ícone à direita
// de cada linha da tabela).
export function RouteModal({ task, onSave, onClose }: RouteModalProps) {
  const [draft, setDraft] = useState<TaskRoute>(task.route ?? EMPTY_ROUTE);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Rota — "{task.name}"</h3>
          <button className={styles.close} onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <RouteEditor value={draft} onChange={setDraft} />

        <div className={styles.footer}>
          <Button variant="solid" onClick={() => onSave(draft)}>
            Salvar rota
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar edição
          </Button>
        </div>
      </div>
    </div>
  );
}

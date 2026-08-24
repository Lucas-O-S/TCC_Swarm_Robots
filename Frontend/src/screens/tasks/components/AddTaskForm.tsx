import { useState } from 'react';
import type { TaskDraft, TaskRoute } from '../types';
import { EMPTY_ROUTE } from '../types';
import { Button } from '../../../components/Button/Button';
import { RouteEditor } from './RouteEditor';
import styles from './AddTaskForm.module.css';

interface AddTaskFormProps {
  onSubmit: (draft: TaskDraft) => void;
  onCancel: () => void;
}

// Painel de criação de tarefa: nome, quantidade de robôs, se é cíclica e a
// rota/área desenhada no grid. Some/aparece por baixo do botão "+" da tela
// (ver TasksScreen.tsx).
export function AddTaskForm({ onSubmit, onCancel }: AddTaskFormProps) {
  const [name, setName] = useState('');
  const [robotCount, setRobotCount] = useState(4);
  const [cyclic, setCyclic] = useState(false);
  const [route, setRoute] = useState<TaskRoute>(EMPTY_ROUTE);

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), robotCount, cyclic, route });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.fieldsRow}>
        <input
          className={styles.nameInput}
          type="text"
          placeholder="Nome da tarefa"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <input
          className={styles.countInput}
          type="number"
          min={1}
          max={99}
          value={robotCount}
          onChange={(e) => setRobotCount(Number(e.target.value))}
        />
        <label className={styles.cyclicLabel}>
          <input type="checkbox" checked={cyclic} onChange={(e) => setCyclic(e.target.checked)} />
          Tarefa cíclica (reinicia ao concluir)
        </label>
      </div>

      <RouteEditor value={route} onChange={setRoute} />

      <div className={styles.footer}>
        <Button variant="solid" onClick={handleSubmit} disabled={!name.trim()}>
          Adicionar tarefa
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

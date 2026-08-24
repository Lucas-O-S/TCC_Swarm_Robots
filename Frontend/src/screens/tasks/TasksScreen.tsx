import { useState } from 'react';
import { TaskTable } from './components/TaskTable';
import { AddTaskButton } from './components/AddTaskButton';
import { AddTaskForm } from './components/AddTaskForm';
import { RouteModal } from './components/RouteModal';
import { useTasks } from './hooks/useTasks';
import styles from './TasksScreen.module.css';

export function TasksScreen() {
  const { tasks, simulatingIds, addTask, setRobotCount, deploy, cancel, simulate, saveRoute } =
    useTasks();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const editingTask = tasks.find((t) => t.id === editingTaskId) ?? null;

  return (
    <div className={styles.screen}>
      <h2 className={styles.title}>Orquestração de tarefas</h2>

      <TaskTable
        tasks={tasks}
        simulatingIds={simulatingIds}
        onRobotCountChange={setRobotCount}
        onDeploy={deploy}
        onSimulate={simulate}
        onCancel={cancel}
        onEditRoute={setEditingTaskId}
      />

      {formOpen ? (
        <AddTaskForm
          onSubmit={(draft) => {
            addTask(draft);
            setFormOpen(false);
          }}
          onCancel={() => setFormOpen(false)}
        />
      ) : (
        <AddTaskButton onClick={() => setFormOpen(true)} />
      )}

      {editingTask && (
        <RouteModal
          task={editingTask}
          onSave={(route) => {
            saveRoute(editingTask.id, route);
            setEditingTaskId(null);
          }}
          onClose={() => setEditingTaskId(null)}
        />
      )}
    </div>
  );
}

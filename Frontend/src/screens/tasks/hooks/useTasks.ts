import { useCallback, useEffect, useState } from 'react';
import type { Task, TaskDraft, TaskRoute } from '../types';
import { TaskService } from '../../../services/TaskService';
import { TaskStatus } from '../../../enums/TaskStatus.enum';
import { routeToWaypointInputs, waypointsToRoute } from '../utils/routeWaypoints';
import type { TaskModel } from '../../../model/Task.Model';

const STATUS_LABEL: Record<TaskStatus, Task['status']> = {
  [TaskStatus.Pending]: 'Na fila',
  [TaskStatus.InProgress]: 'Executando',
  [TaskStatus.Completed]: 'Concluída',
  [TaskStatus.Cancelled]: 'Cancelada',
};

function toTask(task: TaskModel, cyclic = false): Task {
  return {
    id: task.uuid,
    name: task.name,
    robotCount: task.robots.length,
    route: waypointsToRoute(task.waypoints),
    status: STATUS_LABEL[task.status],
    cyclic,
  };
}

// Estado + regras de negócio da tela de Tarefas. Lista, criação e rota já
// batem na API real (GET/POST/PUT/DELETE /tasks — ver TaskService).
// Deploy/Simular/Cancelar continuam só locais: são automação do
// Orchestrator, fora do escopo de "conectar o CRUD" (ver AGENTS.md,
// "Automação nível 1/2"). `cyclic` e a contagem "desejada" de robôs também
// não existem no backend hoje (não há campo pra isso em TaskModel) — ficam
// só de planejamento client-side, exatamente como já eram nos dados de
// exemplo.
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulatingIds, setSimulatingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await TaskService.list();
    if (!result.ok) {
      setError(result.message);
      setLoading(false);
      return;
    }
    setTasks(result.data.map((t) => toTask(t)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addTask = useCallback(async (draft: TaskDraft) => {
    setError(null);
    const result = await TaskService.create(draft.name, routeToWaypointInputs(draft.route));
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const created = toTask(result.data, draft.cyclic);
    setTasks((prev) => [...prev, { ...created, robotCount: draft.robotCount }]);
  }, []);

  const setRobotCount = useCallback((id: string, robotCount: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, robotCount } : t)));
  }, []);

  // "Deploy"/"Replay": manda a tarefa pra fila de execução real.
  const deploy = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'Executando' } : t)));
  }, []);

  const cancel = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'Cancelada' } : t)));
  }, []);

  // "Simular": roda a tarefa só na tela de Simulação (nenhum robô físico é
  // afetado). Aqui só marcamos o estado transitório pra UI refletir.
  const simulate = useCallback((id: string) => {
    setSimulatingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setSimulatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 4000);
  }, []);

  // Só o modo "rota" (sequência de pontos) tem correspondente no backend
  // (`TaskWaypointModel`); modo "área" fica só local até existir uma
  // decisão de design pra isso — nesse caso não chamamos a API.
  const saveRoute = useCallback(async (id: string, route: TaskRoute) => {
    const waypoints = routeToWaypointInputs(route);
    if (!waypoints) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, route } : t)));
      return;
    }

    setError(null);
    const result = await TaskService.updateWaypoints(id, waypoints);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, route } : t)));
  }, []);

  const removeTask = useCallback(async (id: string) => {
    setError(null);
    const result = await TaskService.remove(id);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    tasks,
    loading,
    error,
    simulatingIds,
    addTask,
    setRobotCount,
    deploy,
    cancel,
    simulate,
    saveRoute,
    removeTask,
  };
}

import { useCallback, useState } from 'react';
import type { Task, TaskDraft, TaskRoute } from '../types';

const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    name: 'Limpar Setor 01',
    robotCount: 4,
    route: {
      mode: 'area',
      points: [
        { col: 2, row: 2 },
        { col: 11, row: 6 },
      ],
    },
    status: 'Na fila',
    cyclic: false,
  },
];

// Estado + regras de negócio (provisórias) da tela de Tarefas: lista de
// tasks, criação, atribuição de rota e as ações de execução (Deploy/Simular/
// Cancelar). Fica fora do componente para as telas/linhas ficarem só com o
// desenho. Troca por chamadas reais ao Orchestrator quando o backend estiver
// integrado (ver AGENTS.md, "Automação nível 1/2").
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [simulatingIds, setSimulatingIds] = useState<Set<string>>(new Set());

  const addTask = useCallback((draft: TaskDraft) => {
    setTasks((prev) => [
      ...prev,
      {
        id: `task-${Date.now()}`,
        name: draft.name,
        robotCount: draft.robotCount,
        route: draft.route,
        cyclic: draft.cyclic,
        status: 'Na fila',
      },
    ]);
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

  const saveRoute = useCallback((id: string, route: TaskRoute) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, route } : t)));
  }, []);

  return { tasks, simulatingIds, addTask, setRobotCount, deploy, cancel, simulate, saveRoute };
}

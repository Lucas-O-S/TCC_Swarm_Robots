import { useCallback, useEffect, useState } from 'react';
import { RobotService } from '../../../services/RobotService';
import { TaskService } from '../../../services/TaskService';
import { RobotMapper } from '../../../mapper/Robot.Mapper';
import { RobotStatus } from '../../../enums/RobotStatus.enum';
import type { RobotModel } from '../../../model/Robot.Model';
import type { Robot, RobotCondition } from '../types';

const CONDITION_BY_STATUS: Record<RobotStatus, RobotCondition> = {
  [RobotStatus.Active]: 'Ativo',
  [RobotStatus.Inactive]: 'Inativo',
  [RobotStatus.Lost]: 'Perdido',
};

function toRobot(robot: RobotModel, taskNameByUuid: Map<string, string>): Robot {
  return {
    id: robot.uuid,
    label: robot.name,
    condition: CONDITION_BY_STATUS[robot.status],
    battery: RobotMapper.batteryToPercent(robot.battery),
    task: robot.taskId ? (taskNameByUuid.get(robot.taskId) ?? '-') : '-',
  };
}

// Busca a frota real (GET /robots) e, junto, as tasks (GET /tasks) só pra
// resolver taskId -> nome na coluna "Tarefa atual" (o robô só guarda o
// uuid da task, não o nome). Ver STATUS.md / ARQUITETURA_API.md.
export function useRobots() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [robotsResult, tasksResult] = await Promise.all([RobotService.list(), TaskService.list()]);

    if (!robotsResult.ok) {
      setError(robotsResult.message);
      setLoading(false);
      return;
    }

    const taskNameByUuid = new Map<string, string>();
    if (tasksResult.ok) {
      for (const task of tasksResult.data) taskNameByUuid.set(task.uuid, task.name);
    }

    setRobots(robotsResult.data.map((r) => toRobot(r, taskNameByUuid)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteRobot = useCallback(async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    const result = await RobotService.remove(id);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRobots((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { robots, loading, error, deletingIds, deleteRobot, refresh: load };
}

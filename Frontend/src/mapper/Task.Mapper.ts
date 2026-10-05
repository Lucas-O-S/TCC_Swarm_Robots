import type { TaskDto } from '../dto/task.dto';
import type { Vec2Model } from '../model/SimWorld.Model';
import type { TaskModel } from '../model/Task.Model';

export const TaskMapper = {
  fromDto(dto: TaskDto): TaskModel {
    return {
      uuid: dto.uuid,
      name: dto.name,
      priority: dto.priority,
      status: dto.status as TaskModel['status'],
      waypoints: (dto.waypoints ?? []).map((w) => ({
        orderIndex: w.orderIndex,
        x: w.x,
        y: w.y,
      })),
      robots: dto.robots ?? [],
      isDeleted: dto.deletedAt !== null,
    };
  },

  /** Pontos da rota da tarefa na ordem (orderIndex), em mm — o que o mapa desenha (Simulação e Visualizador). */
  routePoints(task: TaskModel): Vec2Model[] {
    return [...task.waypoints].sort((a, b) => a.orderIndex - b.orderIndex).map((w) => ({ x: w.x, y: w.y }));
  },
};

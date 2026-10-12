import type { TaskDto } from '../dto/task.dto';
import type { TaskCreateRequest } from '../dto/task.create.dto';
import type { TaskUpdateRequest } from '../dto/task.update.dto';
import type { TaskInput, TaskModel, TaskUpdateInput } from '../model/Task.Model';
import { compact } from './compact';
import type { Vec2Model } from '../model/SimWorld.Model';

export const TaskMapper = {
  fromDto(dto: TaskDto): TaskModel {
    return {
      uuid: dto.uuid,
      name: dto.name,
      priority: dto.priority,
      status: dto.status as TaskModel['status'],
      // Ordenado pelo `orderIndex`: a ordem do trajeto é o que importa, não a
      // ordem em que o banco devolveu as linhas.
      waypoints: (dto.waypoints ?? [])
        .map((w) => ({ orderIndex: w.orderIndex, x: w.x, y: w.y }))
        .sort((a, b) => a.orderIndex - b.orderIndex),
      robots: dto.robots ?? [],
      isDeleted: dto.deletedAt != null,
    };
  },

  toCreateDto(input: TaskInput): TaskCreateRequest {
    return compact({ name: input.name, priority: input.priority });
  },

  toUpdateDto(input: TaskUpdateInput): TaskUpdateRequest {
    return compact({ name: input.name, priority: input.priority });
  },

  /** Pontos da rota da tarefa na ordem (orderIndex), em mm — o que o mapa desenha (Simulação e Visualizador). */
  routePoints(task: TaskModel): Vec2Model[] {
    return [...task.waypoints].sort((a, b) => a.orderIndex - b.orderIndex).map((w) => ({ x: w.x, y: w.y }));
  },
};

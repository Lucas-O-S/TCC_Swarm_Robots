import type { TaskDto } from '../dto/task.dto';
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
};

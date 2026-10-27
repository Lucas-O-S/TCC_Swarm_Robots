import { createBaseRepository } from './BaseRepository';
import { taskDtoSchema } from '../dto/task.dto';
import type { TaskDto } from '../dto/task.dto';
import type { TaskCreateRequest } from '../dto/task.create.dto';
import type { TaskUpdateRequest } from '../dto/task.update.dto';

/**
 * Camada de acesso a dados de tarefas: só fala com a API via `Callout` e devolve o `CalloutResult` cru
 */

export const TaskRepository = {
    ...createBaseRepository<TaskDto, TaskCreateRequest, TaskUpdateRequest>('/tasks', taskDtoSchema),
};
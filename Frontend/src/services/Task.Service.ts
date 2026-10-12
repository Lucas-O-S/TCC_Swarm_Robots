import { taskCreateRequestSchema } from '../dto/task.create.dto';
import { taskUpdateRequestSchema } from '../dto/task.update.dto';
import { TaskMapper } from '../mapper/Task.Mapper';
import type { TaskInput, TaskModel, TaskUpdateInput } from '../model/Task.Model';
import { TaskRepository } from '../repository/TaskRepository';
import { fromList, fromUnit, fromVoid, parseRequest } from './ServiceResult';
import type { ServiceResult } from './ServiceResult';

/**
 * Tasks: CRUD completo (`/tasks`).
 */
export const TaskService = {
  async list(): Promise<ServiceResult<TaskModel[]>> {
    return fromList(await TaskRepository.findAll(), TaskMapper.fromDto);
  },

  async getByUuid(uuid: string): Promise<ServiceResult<TaskModel>> {
    return fromUnit(await TaskRepository.findByUuid(uuid), TaskMapper.fromDto);
  },

  async create(input: TaskInput): Promise<ServiceResult<TaskModel>> {
    const body = parseRequest(taskCreateRequestSchema, TaskMapper.toCreateDto(input));
    if (!body.ok) return body;
    return fromUnit(await TaskRepository.create(body.data), TaskMapper.fromDto);
  },

  async update(uuid: string, input: TaskUpdateInput): Promise<ServiceResult<TaskModel>> {
    const body = parseRequest(taskUpdateRequestSchema, TaskMapper.toUpdateDto(input));
    if (!body.ok) return body;
    return fromUnit(await TaskRepository.update(uuid, body.data), TaskMapper.fromDto);
  },

  async remove(uuid: string): Promise<ServiceResult<void>> {
    return fromVoid(await TaskRepository.remove(uuid));
  },
};
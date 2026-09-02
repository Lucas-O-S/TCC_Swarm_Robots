import { Callout } from '../Integration/Callout';
import { taskDtoSchema } from '../dto/task.dto';
import { taskCreateRequestSchema } from '../dto/task.create.dto';
import type { TaskCreateRequest } from '../dto/task.create.dto';
import type { TaskWaypointInput } from '../dto/taskWaypoint.dto';
import { TaskMapper } from '../mapper/Task.Mapper';
import type { TaskModel } from '../model/Task.Model';
import type { ServiceResult } from './RobotService';

/**
 * SUPOSIÇÃO (rotas e `TaskCreateDto`/`TaskUpdateDto` reais não confirmados
 * contra um `TaskController` real — ver ARQUITETURA_API.md): `GET /tasks`,
 * `POST /tasks`, `PUT /tasks/:uuid` e `DELETE /tasks/:uuid`, mesmo padrão
 * REST de `Robots`/`Users`.
 *
 * `taskDtoSchema` é o schema de **uma** task — em `list()` o `ApiEnvelope`
 * já embrulha isso num array pro campo `data`; em `create`/`updateWaypoints`
 * é o `dataUnit` (um item só) que interessa.
 */
export const TaskService = {
  async list(): Promise<ServiceResult<TaskModel[]>> {
    const result = await Callout.get('/tasks', taskDtoSchema);
    if (!result.ok) return { ok: false, message: result.message };
    return { ok: true, data: (result.envelope.data ?? []).map(TaskMapper.fromDto) };
  },

  async create(name: string, waypoints?: TaskWaypointInput[]): Promise<ServiceResult<TaskModel>> {
    const body: TaskCreateRequest = taskCreateRequestSchema.parse({ name, waypoints });
    const result = await Callout.post('/tasks', body, taskDtoSchema);
    if (!result.ok) return { ok: false, message: result.message };
    if (!result.envelope.dataUnit) {
      return { ok: false, message: 'Resposta de POST /tasks sem a task criada.' };
    }
    return { ok: true, data: TaskMapper.fromDto(result.envelope.dataUnit) };
  },

  /** Salva só a rota (waypoints) de uma task já existente. */
  async updateWaypoints(uuid: string, waypoints: TaskWaypointInput[]): Promise<ServiceResult<TaskModel>> {
    const result = await Callout.put(`/tasks/${uuid}`, { waypoints }, taskDtoSchema);
    if (!result.ok) return { ok: false, message: result.message };
    if (!result.envelope.dataUnit) {
      return { ok: false, message: 'Resposta de PUT /tasks/:uuid sem a task atualizada.' };
    }
    return { ok: true, data: TaskMapper.fromDto(result.envelope.dataUnit) };
  },

  async remove(uuid: string): Promise<ServiceResult<void>> {
    const result = await Callout.delete(`/tasks/${uuid}`);
    if (!result.ok) return { ok: false, message: result.message };
    return { ok: true, data: undefined };
  },
};

import type {
  AssignTaskRequest,
  AssignTaskResponse,
  AutoStateResponse,
  AutoToggleRequest,
} from '../dto/orchestrator.dto';
import type { AutoAssignModel, TaskAssignmentModel } from '../model/Orchestrator.Model';

export const OrchestratorMapper = {
  assignmentFromDto(dto: AssignTaskResponse): TaskAssignmentModel {
    return { address: dto.address, taskId: dto.taskId };
  },

  autoFromDto(dto: AutoStateResponse): AutoAssignModel {
    return { enabled: dto.enabled };
  },

  toAssignDto(taskId: string): AssignTaskRequest {
    return { taskId };
  },

  toAutoToggleDto(enabled: boolean): AutoToggleRequest {
    return { enabled };
  },
};

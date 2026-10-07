import { assignTaskRequestSchema, autoToggleRequestSchema } from '../dto/orchestrator.dto';
import { OrchestratorMapper } from '../mapper/Orchestrator.Mapper';
import { RobotMapper } from '../mapper/Robot.Mapper';
import type { AutoAssignModel, TaskAssignmentModel } from '../model/Orchestrator.Model';
import { OrchestratorRepository } from '../repository/OrchestratorRepository';
import { fromUnit, parseRequest } from './ServiceResult';
import type { ServiceResult } from './ServiceResult';

/** Orquestrador: atribuição manual de task a robô e liga/desliga da atribuição automática. */
export const OrchestratorService = {
  async assignTask(address: string, taskId: string): Promise<ServiceResult<TaskAssignmentModel>> {
    const body = parseRequest(assignTaskRequestSchema, OrchestratorMapper.toAssignDto(taskId));
    if (!body.ok) return body;
    const target = RobotMapper.normalizeAddress(address);
    return fromUnit(await OrchestratorRepository.assignTask(target, body.data), OrchestratorMapper.assignmentFromDto);
  },

  async getAutoAssign(): Promise<ServiceResult<AutoAssignModel>> {
    return fromUnit(await OrchestratorRepository.getAuto(), OrchestratorMapper.autoFromDto);
  },

  async setAutoAssign(enabled: boolean): Promise<ServiceResult<AutoAssignModel>> {
    const body = parseRequest(autoToggleRequestSchema, OrchestratorMapper.toAutoToggleDto(enabled));
    if (!body.ok) return body;
    return fromUnit(await OrchestratorRepository.setAuto(body.data), OrchestratorMapper.autoFromDto);
  },
};

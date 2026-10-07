import { Callout } from '../Integration/Callout';
import type { CalloutResult } from '../Integration/Callout';
import { assignTaskResponseSchema, autoStateResponseSchema } from '../dto/orchestrator.dto';
import type {
    AssignTaskRequest,
    AssignTaskResponse,
    AutoStateResponse,
    AutoToggleRequest,
} from '../dto/orchestrator.dto';

/** Rotas de `OrchestratorController` (`/orchestrator`): atribuição manual e liga/desliga da automática. */
export const OrchestratorRepository = {
    /** `PUT /orchestrator/robots/:address/assign`. Robô precisa estar em Auto/SemiAuto e livre. */
    assignTask(address: string, body: AssignTaskRequest): Promise<CalloutResult<AssignTaskResponse>> {
        return Callout.put(
            `/orchestrator/robots/${encodeURIComponent(address)}/assign`,
            body,
            assignTaskResponseSchema,
        );
    },

    /** `GET /orchestrator/auto` */
    getAuto(): Promise<CalloutResult<AutoStateResponse>> {
        return Callout.get('/orchestrator/auto', autoStateResponseSchema);
    },

    /** `PUT /orchestrator/auto` */
    setAuto(body: AutoToggleRequest): Promise<CalloutResult<AutoStateResponse>> {
        return Callout.put('/orchestrator/auto', body, autoStateResponseSchema);
    },
};

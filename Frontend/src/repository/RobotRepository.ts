import { Callout } from '../Integration/Callout';
import type { CalloutResult } from '../Integration/Callout';
import { robotDtoSchema } from '../dto/robot.dto';
import type { RobotDto } from '../dto/robot.dto';

/**
 * Camada de acesso a dados dos robôs: só fala com a API via `Callout` e
 * devolve o `CalloutResult` cru, ainda em `RobotDto` (sem mapear pra `RobotModel`).
 */
export const RobotRepository = {
    findAll(): Promise<CalloutResult<RobotDto>> {
        return Callout.get('/robots', robotDtoSchema);
    },
    
    findByUuid(uuid: string): Promise<CalloutResult<RobotDto>> {
        return Callout.get(`/robots/${uuid}`, robotDtoSchema);
    },
    
    remove(uuid: string) {
        return Callout.delete(`/robots/${uuid}`);
    },
};
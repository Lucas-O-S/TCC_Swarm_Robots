import { Callout } from '../Integration/Callout';
import type { CalloutResult } from '../Integration/Callout';
import { robotStateDtoSchema } from '../dto/robot.state.dto';
import type { RobotStateDto } from '../dto/robot.state.dto';

/**
 * Rota de `SwarmController` (`GET /robots/:address/status`): o estado "quente"
 * do robô que o backend guarda em memória. Obs.: esta rota NÃO tem
 * `JwtAuthGuard` no backend (é pública hoje).
 */
export const RobotStateRepository = {
    findByAddress(address: string): Promise<CalloutResult<RobotStateDto>> {
        return Callout.get(`/robots/${encodeURIComponent(address)}/status`, robotStateDtoSchema);
    },
};

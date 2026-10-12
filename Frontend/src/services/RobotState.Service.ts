import { RobotMapper } from '../mapper/Robot.Mapper';
import { RobotStateMapper } from '../mapper/RobotState.Mapper';
import type { RobotStateModel } from '../model/RobotState.Model';
import { RobotStateRepository } from '../repository/RobotStateRepository';
import { fromNullableUnit } from './ServiceResult';
import type { ServiceResult } from './ServiceResult';

/** Estado em tempo (quase) real de um robô, vindo da memória do backend. */
export const RobotStateService = {
  /**
   * `ok: true` com `data: null` = o robô existe, mas ainda não mandou nenhum
   * frame (estado vazio válido, não é erro). Robô inexistente não é erro
   * aqui também: a rota só consulta a memória e responde `null`.
   */
  async getStatus(address: string): Promise<ServiceResult<RobotStateModel | null>> {
    const target = RobotMapper.normalizeAddress(address);
    return fromNullableUnit(await RobotStateRepository.findByAddress(target), RobotStateMapper.fromDto);
  },
};

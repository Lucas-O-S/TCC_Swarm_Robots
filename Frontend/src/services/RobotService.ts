import { Callout } from '../Integration/Callout';
import { robotDtoSchema } from '../dto/robot.dto';
import { RobotMapper } from '../mapper/Robot.Mapper';
import type { RobotModel } from '../model/Robot.Model';

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; message: string };

/**
 * SUPOSIÇÃO (rotas não confirmadas contra um `RobotController` real):
 * `GET /robots` e `DELETE /robots/:uuid`, por analogia com o padrão REST já
 * usado em `Auth`/`Users` (ver ARQUITETURA_API.md). Ajustar aqui se o
 * backend usar outro prefixo.
 *
 * Só lista + exclui: não existe formulário de "novo robô" na tela hoje
 * (diferente de Tarefas), então `create`/`update` não foram construídos —
 * é fácil adicionar seguindo o mesmo padrão de `TaskService.create` se
 * precisar.
 *
 * `robotDtoSchema` passado aqui é o schema de **um** robô — `ApiEnvelope`
 * já embrulha isso num array pro campo `data` (ver `ApiEnvelope.ts`,
 * `apiEnvelopeSchema`), então não precisa (nem deve) passar
 * `z.array(robotDtoSchema)` aqui.
 */
export const RobotService = {
  async list(): Promise<ServiceResult<RobotModel[]>> {
    const result = await Callout.get('/robots', robotDtoSchema);
    if (!result.ok) return { ok: false, message: result.message };
    return { ok: true, data: (result.envelope.data ?? []).map(RobotMapper.fromDto) };
  },

  async remove(uuid: string): Promise<ServiceResult<void>> {
    const result = await Callout.delete(`/robots/${uuid}`);
    if (!result.ok) return { ok: false, message: result.message };
    return { ok: true, data: undefined };
  },
};

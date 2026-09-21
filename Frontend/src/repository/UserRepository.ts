import { createBaseRepository } from './BaseRepository';
import { Callout } from '../Integration/Callout';
import { userDtoSchema } from '../dto/user.dto';
import type { UserDto } from '../dto/user.dto';
import type { UserUpdateRequest } from '../dto/user.update.dto';
import type { UserCreateRequest, UserCreateResponse } from '../dto/user.create.dto';
import { userCreateResponseSchema } from '../dto/user.create.dto';
import type { CalloutResult } from '../Integration/Callout';

/**
 * Camada de acesso a dados do usuário: só fala com a API via `Callout` e devolve o `CalloutResult` cru
 */
const genericRepository = createBaseRepository<UserDto, UserCreateRequest, UserUpdateRequest>(
    '/user',
    userDtoSchema,
);

/**
 * Uso do `POST /auth/register` e não `POST /user`, pois a resposta é só `{ uuid, username }` (`UserCreateResponse`).
 * Por isso a remoção do `.create()` genérico (que bateria em `/user` com o schema errado) e o uso do `register()`,
 * com a URL e o schema de resposta certos.
 * Caso um novo método seja criado em BaseRepository e tenha importância para o UserRepository,
 * ele deve ser adicionado manualmente aqui.
 */
export const UserRepository = {
    findAll: genericRepository.findAll,
    findByUuid: genericRepository.findByUuid,
    update: genericRepository.update,
    remove: genericRepository.remove,

    register(body: UserCreateRequest): Promise<CalloutResult<UserCreateResponse>> {
        return Callout.post('/auth/register', body, userCreateResponseSchema);
    },
};
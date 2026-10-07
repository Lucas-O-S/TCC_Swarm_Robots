import { userCreateRequestSchema } from '../dto/user.create.dto';
import { userUpdateRequestSchema } from '../dto/user.update.dto';
import { UserMapper } from '../mapper/User.Mapper';
import type { UserModel, UserRegisterInput, UserSummaryModel, UserUpdateInput } from '../model/User.Model';
import { UserRepository } from '../repository/UserRepository';
import { fromList, fromUnit, fromVoid, parseRequest } from './ServiceResult';
import type { ServiceResult } from './ServiceResult';

/** Usuários do sistema (operadores). Listar/editar/remover exigem token quando `AUTH_ACTIVATED=true`. */
export const UserService = {
  async list(): Promise<ServiceResult<UserModel[]>> {
    return fromList(await UserRepository.findAll(), UserMapper.fromDto);
  },

  async getByUuid(uuid: string): Promise<ServiceResult<UserModel>> {
    return fromUnit(await UserRepository.findByUuid(uuid), UserMapper.fromDto);
  },

  /** `POST /auth/register`. Username repetido = falha `conflict` (409). */
  async register(input: UserRegisterInput): Promise<ServiceResult<UserSummaryModel>> {
    const body = parseRequest(userCreateRequestSchema, UserMapper.toRegisterDto(input));
    if (!body.ok) return body;
    return fromUnit(await UserRepository.register(body.data), UserMapper.fromCreateResponse);
  },

  async update(uuid: string, input: UserUpdateInput): Promise<ServiceResult<UserModel>> {
    const body = parseRequest(userUpdateRequestSchema, UserMapper.toUpdateDto(input));
    if (!body.ok) return body;
    return fromUnit(await UserRepository.update(uuid, body.data), UserMapper.fromDto);
  },

  async remove(uuid: string): Promise<ServiceResult<void>> {
    return fromVoid(await UserRepository.remove(uuid));
  },
};

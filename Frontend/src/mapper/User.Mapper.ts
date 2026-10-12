import type { UserCreateRequest, UserCreateResponse } from '../dto/user.create.dto';
import type { UserDto } from '../dto/user.dto';
import type { UserUpdateRequest } from '../dto/user.update.dto';
import type { UserModel, UserRegisterInput, UserSummaryModel, UserUpdateInput } from '../model/User.Model';
import { compact } from './compact';

/** Converte o formato "de rede" (DTO já validado pelo Zod) pro formato usado na UI, e de volta. */
export const UserMapper = {
  fromDto(dto: UserDto): UserModel {
    return {
      uuid: dto.uuid,
      username: dto.username,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      isDeleted: dto.deletedAt != null,
    };
  },

  fromCreateResponse(dto: UserCreateResponse): UserSummaryModel {
    return { uuid: dto.uuid, username: dto.username };
  },

  toRegisterDto(input: UserRegisterInput): UserCreateRequest {
    return { username: input.username, password: input.password };
  },

  toUpdateDto(input: UserUpdateInput): UserUpdateRequest {
    return compact({ username: input.username });
  },
};
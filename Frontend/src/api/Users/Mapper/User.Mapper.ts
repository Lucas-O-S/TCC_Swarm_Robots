import type { UserCreateResponse } from '../DTO/user.create.dto';
import type { UserDto } from '../DTO/user.dto';
import type { UserModel, UserSummaryModel } from '../Model/User.Model';

/** Converte o formato "de rede" (DTO já validado pelo Zod) pro formato usado na UI. */
export const UserMapper = {
  fromDto(dto: UserDto): UserModel {
    return {
      uuid: dto.uuid,
      username: dto.username,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      isDeleted: dto.deletedAt !== null,
    };
  },

  fromCreateResponse(dto: UserCreateResponse): UserSummaryModel {
    return { uuid: dto.uuid, username: dto.username };
  },
};

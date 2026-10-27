import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { BaseService } from "src/Classes/Base/Base.Service";
import { UserModel } from "src/Model/User.Model";
import { UserRepository } from "./User.Repository";
import { UserCreateDto } from "./DTO/user.create.dto";

const SALT_ROUNDS = 10;

/**
 * CRUD básico (getOne/getAll/update/remove) vem do BaseService; aqui a
 * lógica específica do User - registro com hash de senha e validação de
 * credenciais (usado pelo AuthService no login).
 */
@Injectable()
export class UserService extends BaseService<UserModel> {

    constructor(private readonly userRepository: UserRepository) {
        super(userRepository);
    }

    async register(dto: UserCreateDto): Promise<UserModel> {
        const existing = await this.userRepository.getByUsername(dto.username);
        if (existing) {
            throw new ConflictException("Nome de usuário já está em uso");
        }

        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
        return await this.userRepository.insert({
            username: dto.username,
            passwordHash,
        });
    }

    async validateCredentials(username: string, password: string): Promise<UserModel> {
        const user = await this.userRepository.getByUsername(username);
        if (!user) {
            throw new UnauthorizedException("Usuário ou senha inválidos");
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            throw new UnauthorizedException("Usuário ou senha inválidos");
        }

        return user;
    }
}

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { UserModel } from "src/Model/User.Model";
import { BaseRepository } from "src/Classes/Base/Base.Repository";

/**
 * CRUD básico vem do BaseRepository; aqui só o que é específico do User.
 */
@Injectable()
export class UserRepository extends BaseRepository<UserModel> {

    constructor(
        @InjectModel(UserModel) model: typeof UserModel
    ) {
        super(model);
    }

    /**
     * `.unscoped()` porque o `defaultScope` do UserModel exclui
     * `passwordHash` (pra não vazar hash nas rotas de CRUD genérico) - aqui
     * é exatamente o único lugar que precisa do hash de volta (login).
     */
    async getByUsername(username: string): Promise<UserModel | null> {
        return await this.model.unscoped().findOne({ where: { username } });
    }
}

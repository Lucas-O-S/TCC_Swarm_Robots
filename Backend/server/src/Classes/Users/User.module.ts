import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { UserModel } from "src/Model/User.Model";
import { UserRepository } from "./User.Repository";
import { UserService } from "./User.Service";
import { UserController } from "./User.Controller";

/**
 * UserController expõe GET/PUT/DELETE (create é bloqueado - ver
 * User.Controller.ts, criação é só via POST /auth/register). UserService é
 * exportado pra o AuthModule (e futuros guards) usarem.
 */
@Module({
    imports: [
        SequelizeModule.forFeature([UserModel]),
    ],
    controllers: [UserController],
    providers: [UserService, UserRepository],
    exports: [UserService],
})
export class UserModule {}

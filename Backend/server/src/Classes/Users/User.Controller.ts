import { Body, Controller, ForbiddenException, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiTags } from "@nestjs/swagger";
import { BaseController } from "src/Classes/Base/Base.Controller";
import { UserModel } from "src/Model/User.Model";
import { JwtAuthGuard } from "src/Auth/Guards/JwtAuth.Guard";
import { UserService } from "./User.Service";
import { UserUpdateDto } from "./DTO/user.update.dto";
import { UserSchema } from "./Schema/User.Schema";
import { UserUpdateSchema } from "./Schema/UserUpdate.Schema";

/**
 * GET /, GET /:uuid, DELETE /:uuid vêm do BaseController como estão.
 * `create` é bloqueado de propósito: criar usuário só via
 * `POST /auth/register` (garante hash de senha + checagem de username
 * duplicado) - se deixasse o create genérico do BaseController exposto
 * aqui, ele gravaria o body cru (sem hash) direto no banco.
 * `update` é sobrescrito com um DTO que não aceita `passwordHash` (trocar
 * senha é um fluxo à parte, não implementado ainda).
 */
@Controller("users")
@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserController extends BaseController<UserModel> {

    constructor(userService: UserService) {
        super(userService);
    }

    @Post()
    async create(): Promise<never> {
        throw new ForbiddenException("Use POST /auth/register para criar um usuário");
    }

    @Put(":uuid")
    @ApiBody(UserUpdateSchema)
    async update(@Param("uuid") uuid: string, @Body() dto: UserUpdateDto): Promise<UserModel> {
        return super.update(uuid, dto);
    }
}

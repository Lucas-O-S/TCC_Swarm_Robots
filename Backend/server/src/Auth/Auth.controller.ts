import { Body, Controller, Get, Post, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./Auth.service";
import { LoginDto } from "./DTO/login.dto";
import { LoginSchema } from "./Schema/Login.Schema";
import { UserService } from "src/Classes/Users/User.Service";
import { UserCreateDto } from "src/Classes/Users/DTO/user.create.dto";
import { UserSchema } from "src/Classes/Users/Schema/User.Schema";
import { JwtAuthGuard } from "./Guards/JwtAuth.Guard";

@Controller("auth")
@ApiTags("Auth")
export class AuthController {

    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) {}

    @Post("register")
    @ApiBody(UserSchema)
    @ApiResponse({ status: 201, description: "Usuário registrado com sucesso" })
    async register(@Body() dto: UserCreateDto) {
        const user = await this.userService.register(dto);
        return { uuid: user.uuid, username: user.username };
    }

    @Post("login")
    @ApiBody(LoginSchema)
    @ApiResponse({ status: 200, description: "Login feito com sucesso" })
    async login(@Body() dto: LoginDto) {
        return await this.authService.login(dto);
    }

    /** Rota de teste pra conferir se o JwtAuthGuard/authActivated está funcionando. */
    @Get("me")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: "Usuário autenticado" })
    async me(@Request() req: { user?: { uuid: string; username: string } }) {
        return req.user ?? { message: "Auth desativada (AUTH_ACTIVATED=false) - sem usuário no request" };
    }
}

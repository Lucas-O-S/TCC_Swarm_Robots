import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "src/Classes/Users/User.Service";
import { LoginDto } from "./DTO/login.dto";

@Injectable()
export class AuthService {

    constructor(
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
    ) {}

    async login(dto: LoginDto): Promise<{ access_token: string }> {
        const user = await this.userService.validateCredentials(dto.username, dto.password);

        const payload = { username: user.username, sub: user.uuid };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}

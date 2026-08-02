import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UserModule } from "src/Classes/Users/User.module";
import { authConfig } from "src/config/Auth.Config";
import { AuthController } from "./Auth.controller";
import { AuthService } from "./Auth.service";
import { JwtStrategy } from "./Strategies/Jwt.strategy";
import { JwtAuthGuard } from "./Guards/JwtAuth.Guard";

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: "jwt" }),
        JwtModule.register({
            secret: authConfig.jwtSecret,
            signOptions: { expiresIn: authConfig.jwtExpiresIn },
        }),
        UserModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, JwtAuthGuard],
    exports: [AuthService, JwtStrategy, JwtAuthGuard],
})
export class AuthModule {}

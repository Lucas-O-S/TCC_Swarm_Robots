import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { WireControlMode } from "src/Enums/WireControlMode.enum";

/**
 * Corpo do comando control-mode NA BORDA: só o que o robô entende (0 ou 1).
 * `@IsIn` em vez de `@IsEnum` porque o IsEnum de enum numérico também aceita
 * os nomes ("Manual"), que virariam byte errado no rádio.
 */
export class ControlModeDto {

    @ApiProperty({
        description: "Modo enviado ao robô: 0 (Manual) ou 1 (Auto)",
        enum: [WireControlMode.Manual, WireControlMode.Auto],
        example: WireControlMode.Manual,
    })
    @IsIn([WireControlMode.Manual, WireControlMode.Auto], { message: "mode deve ser 0 (Manual) ou 1 (Auto)" })
    mode: WireControlMode;
}

import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * De propósito NÃO tem `password`/`passwordHash` aqui - trocar senha exige
 * um fluxo próprio (validar senha atual etc.), não faz parte deste "básico".
 * Como o ValidationPipe global usa whitelist, qualquer campo fora daqui
 * (incluindo passwordHash) é descartado automaticamente.
 */
export class UserUpdateDto {

    @ApiProperty({
        description: "Novo nome de usuário",
        example: "lucas2",
        required: false,
    })
    @IsOptional()
    @IsString({ message: "O nome de usuário deve ser uma string" })
    @IsNotEmpty({ message: "O nome de usuário não pode ser vazio" })
    username?: string;
}

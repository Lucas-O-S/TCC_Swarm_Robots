import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

/** Campos aceitos ao registrar um novo usuário (operador) do sistema. */
export class UserCreateDto {

    @ApiProperty({
        description: "Nome de usuário (login)",
        example: "lucas",
    })
    @IsString({ message: "O nome de usuário deve ser uma string" })
    @IsNotEmpty({ message: "O nome de usuário não pode ser vazio" })
    username: string;

    @ApiProperty({
        description: "Senha do usuário",
        example: "senhaForte123",
    })
    @IsString({ message: "A senha deve ser uma string" })
    @IsNotEmpty({ message: "A senha não pode ser vazia" })
    @MinLength(6, { message: "A senha deve ter no mínimo 6 caracteres" })
    password: string;
}

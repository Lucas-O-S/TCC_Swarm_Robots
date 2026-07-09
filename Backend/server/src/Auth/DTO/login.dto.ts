import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LoginDto {

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
    password: string;
}

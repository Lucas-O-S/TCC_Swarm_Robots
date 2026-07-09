import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class TaskCreateDto {

    @ApiProperty({
        description: "Nome da tarefa",
        example: "Patrulhar área A",
    })
    @IsString({ message: "O nome deve ser uma string" })
    @IsNotEmpty({ message: "O nome não pode ser vazio" })
    name: string;

    @ApiProperty({
        description: "Prioridade da tarefa (quanto menor, mais prioritária)",
        example: 0,
    })
    @IsInt({ message: "A prioridade deve ser um número inteiro" })
    @Min(0, { message: "A prioridade não pode ser negativa" })
    priority: number;
}

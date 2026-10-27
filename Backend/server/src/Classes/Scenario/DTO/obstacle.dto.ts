import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

/**
 * Obstáculo dentro do body de um Scenario. Não tem rota própria nem
 * `scenarioId` no body: o obstáculo sempre nasce/muda junto com o Scenario
 * dono, e o Repository preenche a FK.
 */
export class ObstacleDto {

    @ApiProperty({ description: "Nome do obstáculo", example: "Caixa 1" })
    @IsString({ message: "O nome do obstáculo deve ser uma string" })
    @IsNotEmpty({ message: "O nome do obstáculo não pode ser vazio" })
    name: string;

    @ApiProperty({ description: "Descrição do obstáculo", required: false })
    @IsOptional()
    @IsString({ message: "A descrição do obstáculo deve ser uma string" })
    description?: string;

    @ApiProperty({ description: "Largura do obstáculo", example: 200 })
    @IsInt({ message: "sizeX do obstáculo deve ser um número inteiro" })
    @Min(1, { message: "sizeX do obstáculo deve ser no mínimo 1" })
    sizeX: number;

    @ApiProperty({ description: "Altura do obstáculo", example: 200 })
    @IsInt({ message: "sizeY do obstáculo deve ser um número inteiro" })
    @Min(1, { message: "sizeY do obstáculo deve ser no mínimo 1" })
    sizeY: number;

    @ApiProperty({ description: "Coordenada X do canto inicial", example: 500 })
    @IsInt({ message: "startPointX deve ser um número inteiro" })
    @Min(0, { message: "startPointX deve ser no mínimo 0" })
    startPointX: number;

    @ApiProperty({ description: "Coordenada Y do canto inicial", example: 500 })
    @IsInt({ message: "startPointY deve ser um número inteiro" })
    @Min(0, { message: "startPointY deve ser no mínimo 0" })
    startPointY: number;
}

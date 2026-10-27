import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { ObstacleDto } from "./obstacle.dto";

export class ScenarioCreateDto {

    @ApiProperty({ description: "Nome do cenário", example: "Arena de teste" })
    @IsString({ message: "O nome deve ser uma string" })
    @IsNotEmpty({ message: "O nome não pode ser vazio" })
    name: string;

    @ApiProperty({ description: "Descrição do cenário", required: false })
    @IsOptional()
    @IsString({ message: "A descrição deve ser uma string" })
    description?: string;

    @ApiProperty({ description: "Largura da área", example: 3000 })
    @IsInt({ message: "sizeX deve ser um número inteiro" })
    @Min(1, { message: "sizeX deve ser no mínimo 1" })
    sizeX: number;

    @ApiProperty({ description: "Altura da área", example: 2000 })
    @IsInt({ message: "sizeY deve ser um número inteiro" })
    @Min(1, { message: "sizeY deve ser no mínimo 1" })
    sizeY: number;

    @ApiProperty({
        description: "Obstáculos do cenário. No update, se enviado, substitui a lista inteira.",
        type: [ObstacleDto],
        required: false,
    })
    @IsOptional()
    @IsArray({ message: "obstacles deve ser uma lista" })
    @ValidateNested({ each: true })
    @Type(() => ObstacleDto)
    obstacles?: ObstacleDto[];
}

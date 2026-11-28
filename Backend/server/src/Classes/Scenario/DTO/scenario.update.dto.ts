import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { ObstacleDto } from "./obstacle.dto";

/**
 * O que o usuário edita no cenário (PUT parcial). Tamanho e área não: vêm da
 * borda (arena:snapshot), que também cria o cenário - não existe POST.
 */
export class ScenarioUpdateDto {

    @ApiProperty({ description: "Nome do cenário", example: "Arena de teste", required: false })
    @IsOptional()
    @IsString({ message: "O nome deve ser uma string" })
    @IsNotEmpty({ message: "O nome não pode ser vazio" })
    name?: string;

    @ApiProperty({ description: "Descrição do cenário", required: false })
    @IsOptional()
    @IsString({ message: "A descrição deve ser uma string" })
    description?: string;

    @ApiProperty({
        description: "Obstáculos do cenário. Se enviado, substitui a lista inteira.",
        type: [ObstacleDto],
        required: false,
    })
    @IsOptional()
    @IsArray({ message: "obstacles deve ser uma lista" })
    @ValidateNested({ each: true })
    @Type(() => ObstacleDto)
    obstacles?: ObstacleDto[];
}

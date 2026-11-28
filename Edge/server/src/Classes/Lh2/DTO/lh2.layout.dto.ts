import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

/**
 * Lado do quadrado e, opcional, a área real onde ele foi colado - o que
 * decide o referencial da calibração (ver Lh2Layout). Base da sessão de
 * captura e do recálculo. Os quatro campos da área vão juntos ou nenhum: sem
 * eles vale o layout do PyDotBot (arena de 5 × o lado, quadrado no meio).
 */
export class Lh2LayoutDto {

    @ApiPropertyOptional({
        description: "Lado do quadrado em mm (default 500 na captura; no recálculo, o da calibração carregada).",
        example: 800,
    })
    @IsOptional()
    @IsInt({ message: "distanceMm deve ser um número inteiro" })
    @Min(100, { message: "distanceMm mínimo é 100" })
    @Max(2000, { message: "distanceMm máximo é 2000" })
    distanceMm?: number;

    @ApiPropertyOptional({ description: "Rótulo da arena, vai no nome do arquivo.", example: "arena-taak" })
    @IsOptional()
    @IsString({ message: "tag deve ser texto" })
    @MaxLength(64, { message: "tag deve ter até 64 caracteres" })
    tag?: string;

    @ApiPropertyOptional({ description: "Largura da área real em mm.", example: 1200 })
    @IsOptional()
    @IsInt({ message: "areaWidthMm deve ser um número inteiro" })
    @Min(100, { message: "areaWidthMm mínimo é 100" })
    @Max(50000, { message: "areaWidthMm máximo é 50000" })
    areaWidthMm?: number;

    @ApiPropertyOptional({ description: "Altura da área real em mm.", example: 1200 })
    @IsOptional()
    @IsInt({ message: "areaHeightMm deve ser um número inteiro" })
    @Min(100, { message: "areaHeightMm mínimo é 100" })
    @Max(50000, { message: "areaHeightMm máximo é 50000" })
    areaHeightMm?: number;

    @ApiPropertyOptional({
        description: "Distância em mm da borda esquerda da área até o canto top-left do quadrado.",
        example: 200,
    })
    @IsOptional()
    @IsInt({ message: "squareXMm deve ser um número inteiro" })
    @Min(0, { message: "squareXMm não pode ser negativo" })
    squareXMm?: number;

    @ApiPropertyOptional({
        description: "Distância em mm da borda de cima da área até o canto top-left do quadrado.",
        example: 200,
    })
    @IsOptional()
    @IsInt({ message: "squareYMm deve ser um número inteiro" })
    @Min(0, { message: "squareYMm não pode ser negativo" })
    squareYMm?: number;
}

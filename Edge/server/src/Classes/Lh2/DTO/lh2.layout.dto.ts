import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

/**
 * Tamanho do retângulo de calibração (as 4 marcas no chão) e, opcional, a área
 * real onde ele foi marcado - o que decide o referencial da calibração (ver
 * Lh2Layout). Base da sessão de captura e da correção. Quadrado: distanceMm
 * (o lado); retângulo: widthMm + heightMm (nunca os dois jeitos juntos). Os
 * quatro campos da área vão juntos ou nenhum: sem eles vale o layout do
 * PyDotBot (arena de 5 × o tamanho, retângulo no meio).
 */
export class Lh2LayoutDto {

    @ApiPropertyOptional({
        description: "Lado do quadrado em mm (default 500 na captura; na correção, o da calibração carregada). Para retângulo, use widthMm + heightMm.",
        example: 800,
    })
    @IsOptional()
    @IsInt({ message: "distanceMm deve ser um número inteiro" })
    @Min(100, { message: "distanceMm mínimo é 100" })
    @Max(2000, { message: "distanceMm máximo é 2000" })
    distanceMm?: number;

    @ApiPropertyOptional({ description: "Largura do retângulo de calibração em mm (vai junto com heightMm).", example: 1000 })
    @IsOptional()
    @IsInt({ message: "widthMm deve ser um número inteiro" })
    @Min(100, { message: "widthMm mínimo é 100" })
    @Max(20000, { message: "widthMm máximo é 20000" })
    widthMm?: number;

    @ApiPropertyOptional({ description: "Altura do retângulo de calibração em mm (vai junto com widthMm).", example: 800 })
    @IsOptional()
    @IsInt({ message: "heightMm deve ser um número inteiro" })
    @Min(100, { message: "heightMm mínimo é 100" })
    @Max(20000, { message: "heightMm máximo é 20000" })
    heightMm?: number;

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
        description: "Distância em mm da borda esquerda da área até o canto top-left do retângulo.",
        example: 100,
    })
    @IsOptional()
    @IsInt({ message: "rectXMm deve ser um número inteiro" })
    @Min(0, { message: "rectXMm não pode ser negativo" })
    rectXMm?: number;

    @ApiPropertyOptional({
        description: "Distância em mm da borda de cima da área até o canto top-left do retângulo.",
        example: 200,
    })
    @IsOptional()
    @IsInt({ message: "rectYMm deve ser um número inteiro" })
    @Min(0, { message: "rectYMm não pode ser negativo" })
    rectYMm?: number;
}

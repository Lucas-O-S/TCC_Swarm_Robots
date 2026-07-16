import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

/**
 * Corpo do comando move-raw (joystick). Cada eixo é um int8 assinado
 * (-128 a 127), igual ao PayloadCommandMoveRaw do protocolo DotBot.
 */
export class MoveRawDto {

    @ApiProperty({ description: "Eixo X do analógico esquerdo (-128 a 127)", example: 100 })
    @IsInt({ message: "left_x deve ser um número inteiro" })
    @Min(-128, { message: "left_x deve ser no mínimo -128" })
    @Max(127, { message: "left_x deve ser no máximo 127" })
    left_x: number;

    @ApiProperty({ description: "Eixo Y do analógico esquerdo (-128 a 127)", example: 0 })
    @IsInt({ message: "left_y deve ser um número inteiro" })
    @Min(-128, { message: "left_y deve ser no mínimo -128" })
    @Max(127, { message: "left_y deve ser no máximo 127" })
    left_y: number;

    @ApiProperty({ description: "Eixo X do analógico direito (-128 a 127)", example: 0 })
    @IsInt({ message: "right_x deve ser um número inteiro" })
    @Min(-128, { message: "right_x deve ser no mínimo -128" })
    @Max(127, { message: "right_x deve ser no máximo 127" })
    right_x: number;

    @ApiProperty({ description: "Eixo Y do analógico direito (-128 a 127)", example: 0 })
    @IsInt({ message: "right_y deve ser um número inteiro" })
    @Min(-128, { message: "right_y deve ser no mínimo -128" })
    @Max(127, { message: "right_y deve ser no máximo 127" })
    right_y: number;
}

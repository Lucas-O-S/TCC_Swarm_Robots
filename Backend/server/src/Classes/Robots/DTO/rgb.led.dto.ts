import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

/**
 * Corpo do comando rgb-led. Cada canal é um byte sem sinal (0 a 255),
 * igual ao PayloadCommandRgbLed do protocolo DotBot.
 */
export class RgbLedDto {

    @ApiProperty({ description: "Canal vermelho (0 a 255)", example: 255 })
    @IsInt({ message: "red deve ser um número inteiro" })
    @Min(0, { message: "red deve ser no mínimo 0" })
    @Max(255, { message: "red deve ser no máximo 255" })
    red: number;

    @ApiProperty({ description: "Canal verde (0 a 255)", example: 0 })
    @IsInt({ message: "green deve ser um número inteiro" })
    @Min(0, { message: "green deve ser no mínimo 0" })
    @Max(255, { message: "green deve ser no máximo 255" })
    green: number;

    @ApiProperty({ description: "Canal azul (0 a 255)", example: 0 })
    @IsInt({ message: "blue deve ser um número inteiro" })
    @Min(0, { message: "blue deve ser no mínimo 0" })
    @Max(255, { message: "blue deve ser no máximo 255" })
    blue: number;
}

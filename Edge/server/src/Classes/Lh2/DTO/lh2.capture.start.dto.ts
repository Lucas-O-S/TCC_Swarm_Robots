import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import { ADDRESS_REGEX } from "src/Constants/Address.Constants";

/** Início da captura LH2: qual robô e o tamanho do quadrado marcado no chão. */
export class Lh2CaptureStartDto {

    @ApiProperty({ description: "Endereço do robô (16 hex) que vai percorrer os cantos.", example: "BDF2B04BC00D2725" })
    @Matches(ADDRESS_REGEX, { message: "address deve ter 16 dígitos hexadecimais" })
    address: string;

    @ApiPropertyOptional({
        description: "Lado do quadrado em mm (default 500). A arena útil é 5 × o lado, centrada.",
        example: 500,
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

    @ApiPropertyOptional({
        description: "Canal da base station a calibrar (1 a 16). Sem ele, vale o de menor número que o robô enxergar na primeira leitura.",
        example: 7,
    })
    @IsOptional()
    @IsInt({ message: "channel deve ser um número inteiro" })
    @Min(1, { message: "channel mínimo é 1" })
    @Max(16, { message: "channel máximo é 16" })
    channel?: number;
}

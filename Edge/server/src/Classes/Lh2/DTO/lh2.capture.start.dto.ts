import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Matches, Max, Min } from "class-validator";
import { ADDRESS_REGEX } from "src/Constants/Address.Constants";
import { Lh2LayoutDto } from "./lh2.layout.dto";

/** Início da captura LH2: qual robô, o quadrado marcado no chão e, opcional, a área real (Lh2LayoutDto). */
export class Lh2CaptureStartDto extends Lh2LayoutDto {

    @ApiProperty({ description: "Endereço do robô (16 hex) que vai percorrer os cantos.", example: "BDF2B04BC00D2725" })
    @Matches(ADDRESS_REGEX, { message: "address deve ter 16 dígitos hexadecimais" })
    address: string;

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

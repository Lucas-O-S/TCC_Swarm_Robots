import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, Matches } from "class-validator";
import { ADDRESS_REGEX } from "src/Constants/Address.Constants";

/** Corpo do reenvio forçado da calibração LH2. */
export class Lh2PushDto {

    @ApiPropertyOptional({
        description: "Endereço do robô (16 hex). Sem ele, vale para a frota toda.",
        example: "BDF2B04BC00D2725",
    })
    @IsOptional()
    @Matches(ADDRESS_REGEX, { message: "address deve ter 16 dígitos hexadecimais" })
    address?: string;
}

import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

/** Corpo do comando xgo-action: código da ação (0 a 255). Só robôs XGO. */
export class XgoActionDto {

    @ApiProperty({ description: "Código da ação do XGO (0 a 255)", example: 1 })
    @IsInt({ message: "action deve ser um número inteiro" })
    @Min(0, { message: "action deve ser no mínimo 0" })
    @Max(255, { message: "action deve ser no máximo 255" })
    action: number;
}

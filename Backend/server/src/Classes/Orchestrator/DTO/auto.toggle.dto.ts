import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

/** Corpo do liga/desliga da atribuição automática. */
export class AutoToggleDto {

    @ApiProperty({
        description: "true liga, false desliga a atribuição automática de tasks a robôs em Auto",
        example: false,
    })
    @IsBoolean({ message: "enabled deve ser true ou false" })
    enabled: boolean;
}

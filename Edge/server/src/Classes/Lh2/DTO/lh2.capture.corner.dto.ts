import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { Lh2Corner } from "src/Enums/Lh2Corner.enum";

/** Canto em que o robô está agora, com o fotodiodo em cima da marca. */
export class Lh2CaptureCornerDto {

    @ApiProperty({ enum: Lh2Corner, example: Lh2Corner.TopLeft })
    @IsEnum(Lh2Corner, { message: `corner deve ser um de: ${Object.values(Lh2Corner).join(", ")}` })
    corner: Lh2Corner;
}

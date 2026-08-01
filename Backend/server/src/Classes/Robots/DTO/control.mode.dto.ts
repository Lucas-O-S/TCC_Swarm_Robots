import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { RobotControlMode } from "src/Enums/RobotControlMode.Enum";

/** Corpo do comando control-mode: alterna o robô entre Manual (0) e Auto (1). */
export class ControlModeDto {

    @ApiProperty({
        description: "Modo de controle do robô",
        enum: RobotControlMode,
        example: RobotControlMode.Manual,
    })
    @IsEnum(RobotControlMode, { message: "mode deve ser 0 (Manual) ou 1 (Auto)" })
    mode: RobotControlMode;
}

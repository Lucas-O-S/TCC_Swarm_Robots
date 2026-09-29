import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { RobotControlMode } from "src/Enums/RobotControlMode.enum";

/**
 * Corpo do comando control-mode: alterna o robô entre Manual (0) e Auto (1).
 * SemiAuto (2) não é aceito aqui - o firmware só conhece 0 e 1.
 */
export class ControlModeDto {

    @ApiProperty({
        description: "Modo de controle do robô",
        enum: [RobotControlMode.Manual, RobotControlMode.Auto],
        example: RobotControlMode.Manual,
    })
    @IsIn([RobotControlMode.Manual, RobotControlMode.Auto], { message: "mode deve ser 0 (Manual) ou 1 (Auto)" })
    mode: RobotControlMode;
}

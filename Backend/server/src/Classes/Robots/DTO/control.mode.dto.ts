import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { RobotControlMode } from "src/Enums/RobotControlMode.enum";

/**
 * Corpo do comando control-mode: Manual (0), Auto (1) ou SemiAuto (2).
 * O modo é regra do backend (grava em robots.mode); pro robô o comando só
 * para os motores - ver RobotService.setControlMode.
 */
export class ControlModeDto {

    @ApiProperty({
        description: "Modo de controle do robô: 0 (Manual), 1 (Auto) ou 2 (SemiAuto)",
        enum: RobotControlMode,
        example: RobotControlMode.Manual,
    })
    @IsEnum(RobotControlMode, { message: "mode deve ser 0 (Manual), 1 (Auto) ou 2 (SemiAuto)" })
    mode: RobotControlMode;
}

import { PartialType } from "@nestjs/swagger";
import { RobotCreateDto } from "./robot.create.dto";

/** Mesmos campos do RobotCreateDto, todos opcionais (PATCH/PUT parcial). */
export class RobotUpdateDto extends PartialType(RobotCreateDto) {}

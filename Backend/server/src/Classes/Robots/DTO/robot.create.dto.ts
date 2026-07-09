import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";
import { RobotApplication } from "src/Protocol/Enums/RobotApplication.enum";

/**
 * Campos aceitos ao registrar um robô via API. Campos calculados/geridos
 * pelo backend (status, lastSync, mode em runtime) não entram aqui.
 */
export class RobotCreateDto {

    @IsString()
    @IsNotEmpty()
    @MaxLength(16)
    address: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsEnum(RobotApplication)
    application?: RobotApplication;

    @IsOptional()
    @IsString()
    @MaxLength(8)
    swarmId?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    waypointsThreshold?: number;

    @IsOptional()
    @IsUUID()
    taskId?: string;
}
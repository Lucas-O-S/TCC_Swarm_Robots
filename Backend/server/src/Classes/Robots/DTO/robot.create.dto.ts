import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";
import { RobotApplication } from "src/Enums/RobotApplication.enum";

/**
 * Campos aceitos ao registrar um robô via API. Campos calculados/geridos
 * pelo backend (status, lastSync, mode em runtime) não entram aqui.
 */
export class RobotCreateDto {

    @ApiProperty({
        description: "Endereço físico do rádio (hex) - chave real do protocolo",
        example: "0000000000000001",
    })
    @IsString({ message: "O endereço deve ser uma string" })
    @IsNotEmpty({ message: "O endereço não pode ser vazio" })
    @MaxLength(16, { message: "O endereço deve ter no máximo 16 caracteres" })
    address: string;

    @ApiProperty({
        description: "Nome amigável do robô",
        example: "DotBot 01",
    })
    @IsString({ message: "O nome deve ser uma string" })
    @IsNotEmpty({ message: "O nome não pode ser vazio" })
    name: string;

    @ApiProperty({
        description: "Tipo de aplicação do robô (protocolo DotBot)",
        enum: RobotApplication,
        required: false,
    })
    @IsOptional()
    @IsEnum(RobotApplication, { message: "Aplicação inválida" })
    application?: RobotApplication;

    @ApiProperty({
        description: "Id do enxame/rede (network_id em hex)",
        example: "0000",
        required: false,
    })
    @IsOptional()
    @IsString({ message: "O swarmId deve ser uma string" })
    @MaxLength(8, { message: "O swarmId deve ter no máximo 8 caracteres" })
    swarmId?: string;

    @ApiProperty({
        description: "Distância mínima (mm) para considerar que chegou num waypoint",
        example: 100,
        required: false,
    })
    @IsOptional()
    @IsInt({ message: "waypointsThreshold deve ser um número inteiro" })
    @Min(1, { message: "waypointsThreshold deve ser maior que zero" })
    waypointsThreshold?: number;

    @ApiProperty({
        description: "Uuid da task já atribuída ao robô",
        required: false,
    })
    @IsOptional()
    @IsUUID(undefined, { message: "taskId deve ser um UUID válido" })
    taskId?: string;
}
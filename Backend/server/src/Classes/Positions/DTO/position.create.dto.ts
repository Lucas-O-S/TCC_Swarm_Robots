import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsUUID } from "class-validator";
import { PositionSource } from "src/Enums/PositionSource.Enum";

export class PositionCreateDto {

    @ApiProperty({
        description: "Uuid do robô dono desta amostra de posição",
    })
    @IsUUID(undefined, { message: "robotId deve ser um UUID válido" })
    @IsNotEmpty({ message: "robotId não pode ser vazio" })
    robotId: string;

    @ApiProperty({
        description: "Origem da amostra (0 = LH2 em mm, 1 = GPS em graus decimais)",
        enum: PositionSource,
        required: false,
    })
    @IsOptional()
    @IsEnum(PositionSource, { message: "source inválido" })
    source?: PositionSource;

    @ApiProperty({
        description: "LH2: x em mm. GPS: latitude em graus decimais.",
        example: 120.5,
    })
    @IsNumber({}, { message: "x deve ser um número" })
    x: number;

    @ApiProperty({
        description: "LH2: y em mm. GPS: longitude em graus decimais.",
        example: 340.2,
    })
    @IsNumber({}, { message: "y deve ser um número" })
    y: number;

    @ApiProperty({
        description: "Direção/heading do robô nesta amostra",
        required: false,
    })
    @IsOptional()
    @IsInt({ message: "direction deve ser um número inteiro" })
    direction?: number;
}

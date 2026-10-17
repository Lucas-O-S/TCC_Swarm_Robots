import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, Min, ValidateNested } from "class-validator";
import { LH2_MAX_WAYPOINTS } from "src/Constants/Lh2.Constants";

/** Um ponto de destino em coordenadas LH2 (mm). */
export class WaypointDto {

    @ApiProperty({ description: "Coordenada X em mm (LH2)", example: 1000 })
    @IsInt({ message: "x deve ser um número inteiro" })
    @Min(0, { message: "x deve ser no mínimo 0" })
    x: number | undefined;

    @ApiProperty({ description: "Coordenada Y em mm (LH2)", example: 2000 })
    @IsInt({ message: "y deve ser um número inteiro" })
    @Min(0, { message: "y deve ser no mínimo 0" })
    y: number | undefined;
}

/** Corpo do comando lh2-waypoints: distância de chegada + lista de pontos. */
export class WaypointsDto {

    @ApiProperty({
        description: "Distância (mm) para considerar que chegou num waypoint",
        example: 100,
    })
    @IsInt({ message: "threshold deve ser um número inteiro" })
    @Min(0, { message: "threshold deve ser no mínimo 0" })
    threshold: number | undefined;

    // O firmware 1.23.0 guarda no máximo LH2_MAX_WAYPOINTS: o excedente é
    // cortado em silêncio e o waypoint_idx nunca chega ao total.
    @ApiProperty({ description: "Lista de pontos de destino", type: [WaypointDto], maxItems: LH2_MAX_WAYPOINTS })
    @IsArray({ message: "waypoints deve ser uma lista" })
    @ArrayMinSize(1, { message: "waypoints deve ter pelo menos um ponto" })
    @ArrayMaxSize(LH2_MAX_WAYPOINTS, { message: `waypoints deve ter no máximo ${LH2_MAX_WAYPOINTS} pontos` }) 
    @ValidateNested({ each: true })
    @Type(() => WaypointDto)
    waypoints: WaypointDto[] | undefined;
}

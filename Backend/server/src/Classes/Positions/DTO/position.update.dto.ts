import { PartialType } from "@nestjs/swagger";
import { PositionCreateDto } from "./position.create.dto";

/** Mesmos campos do PositionCreateDto, todos opcionais (PUT parcial). */
export class PositionUpdateDto extends PartialType(PositionCreateDto) {}

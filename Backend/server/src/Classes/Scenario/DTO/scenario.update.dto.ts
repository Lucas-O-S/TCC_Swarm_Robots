import { PartialType } from "@nestjs/swagger";
import { ScenarioCreateDto } from "./scenario.create.dto";

/** Mesmos campos do ScenarioCreateDto, todos opcionais (PUT parcial). */
export class ScenarioUpdateDto extends PartialType(ScenarioCreateDto) {}

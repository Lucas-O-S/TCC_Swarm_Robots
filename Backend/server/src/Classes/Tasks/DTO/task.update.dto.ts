import { PartialType } from "@nestjs/swagger";
import { TaskCreateDto } from "./task.create.dto";

/** Mesmos campos do TaskCreateDto, todos opcionais (PUT parcial). */
export class TaskUpdateDto extends PartialType(TaskCreateDto) {}

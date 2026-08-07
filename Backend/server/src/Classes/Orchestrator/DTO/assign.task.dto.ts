import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

/** Corpo da atribuição manual: qual task (uuid) vai pro robô. */
export class AssignTaskDto {

    @ApiProperty({
        description: "uuid da task a ser atribuída ao robô",
        format: "uuid",
    })
    @IsUUID()
    taskId: string;
}

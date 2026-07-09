import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { TaskModel } from "src/Model/Task.Model";
import { BaseRepository } from "src/Classes/Base/Base.Repository";

/**
 * CRUD básico vem do BaseRepository; Task hoje não tem nada específico além
 * disso (sem query própria tipo o getByAddress do Robot).
 */
@Injectable()
export class TaskRepository extends BaseRepository<TaskModel> {

    constructor(
        @InjectModel(TaskModel) model: typeof TaskModel
    ) {
        super(model);
    }
}

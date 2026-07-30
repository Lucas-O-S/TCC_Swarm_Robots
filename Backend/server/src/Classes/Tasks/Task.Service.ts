import { Injectable } from "@nestjs/common";
import { BaseService } from "src/Classes/Base/Base.Service";
import { TaskModel } from "src/Model/Task.Model";
import { TaskRepository } from "./Task.Repository";

/**
 * CRUD básico (create/getOne/getAll/update/remove) vem do BaseService.
 */
@Injectable()
export class TaskService extends BaseService<TaskModel> {

    constructor(private readonly taskRepository: TaskRepository) {
        super(taskRepository);
    }


    async getPendingTask() : Promise<TaskModel[] | null> {
        return await this.taskRepository.getPendingTask();
    }

    async getOneTaskWithWaypoints(taskId) : Promise<TaskModel | null>{
        return await this.taskRepository.getOneTaskWithWaypoints(taskId);
    } 

}

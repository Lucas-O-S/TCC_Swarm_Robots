import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { TaskModel } from "src/Model/Task.Model";
import { TaskController } from "./Task.Controller";
import { TaskService } from "./Task.Service";
import { TaskRepository } from "./Task.Repository";

@Module({
    imports: [
        SequelizeModule.forFeature([TaskModel]),
    ],
    controllers: [TaskController],
    providers: [TaskService, TaskRepository],
    exports: [TaskService],
})
export class TaskModule {}

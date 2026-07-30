import { Injectable, OnModuleInit } from "@nestjs/common";
import { TaskModel } from "src/Model/Task.Model";
import { RobotService } from "../Robots/Robot.Service";
import { TaskService } from "../Tasks/Task.Service";
import { RobotModel } from "src/Model/Robot.Model";
import { TaskStatus } from "src/Model/Enums/TaskStatus.enum";
import { PayloadType } from "src/Enums/PayloadType.enum";
import { Command } from "src/Enums/Command.enum";


@Injectable()
export class OrchestratorService implements OnModuleInit {


    constructor(
        private readonly taskService: TaskService,
        private readonly robotService: RobotService
    ) { }


    onModuleInit() {
        setInterval(async () => {
            
            await this.assignPending().catch(error => {
                console.error("Erro ao atribuir tarefas pendentes:", error);
            });

        }, 5000);
    }

    async assignPending() : Promise<void> {

        const pendingTasks :  TaskModel[] = await this.taskService.getPendingTask() ?? [];

        const freeRobots = await this.robotService.getFreeRobots() ?? [];

        const busyRobots : RobotModel[] = [];

        const tasksAssigned : TaskModel[] = [];

        for (const task of pendingTasks) {
            
            // Task sem pontos não é atribuível (ex.: a "Tarefa padrão" do seed,
            // que é Pending mas não tem waypoints). Pula sem gastar um robô.
            if (!task.waypoints?.length) {
                continue;
            }

            const robot = freeRobots.pop() ?? null;

            if (!robot)
                break;
            
            const sent = await this.sendCommandToRobot(robot, task);

            if (!sent) 
                continue;
            
            task.status = TaskStatus.InProgress;

            robot.taskId = task.uuid;

            busyRobots.push(robot);

            tasksAssigned.push(task);

            console.log(`Atribuindo tarefa ${task.name} (uuid: ${task.uuid}) ao robô ${robot.name} (uuid: ${robot.uuid})`);
            
        }

        if(tasksAssigned.length > 0) {
            await Promise.all(
                tasksAssigned.map(task => this.taskService.update(task.uuid, { status: task.status })),
            );
        }

        if(busyRobots.length > 0) {
            await Promise.all(
                busyRobots.map(robot => this.robotService.update(robot.uuid, { taskId: robot.taskId }))
            );
        }

    }

    private async sendCommandToRobot(robot: RobotModel, task: TaskModel): Promise<boolean> {
        try {
            await this.robotService.sendCommand(
                robot.address,
                PayloadType.LH2_WAYPOINTS,
                Command.Waypoints,
                {
                    threshold: robot.waypointsThreshold,
                    waypoints: task.waypoints
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map(wp => ({ x: wp.x, y: wp.y }))
                }
            );
            return true;
        } catch (error) {
            console.error(`Erro ao enviar comando para o robô ${robot.address}:`, error);
            return false;
        }
    }
}
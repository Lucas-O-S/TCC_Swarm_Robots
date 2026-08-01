import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { RobotControlMode } from "src/Enums/RobotControlMode.Enum";
import { TaskModel } from "src/Model/Task.Model";
import { RobotService } from "../Robots/Robot.Service";
import { TaskService } from "../Tasks/Task.Service";
import { RobotModel } from "src/Model/Robot.Model";
import { TaskStatus } from "src/Enums/TaskStatus.Enum";
import { PayloadType } from "src/Enums/PayloadType.Enum";
import { Command } from "src/Enums/Command.Enum";
import { OnEvent } from "@nestjs/event-emitter";
import { EventsCommands } from "src/Enums/Events.Enum";
import { RobotStatus } from "src/Enums/RobotStatus.Enum";


@Injectable()
export class OrchestratorService implements OnModuleInit {

    private RUN_TIME = 5000;
    
    /** Limiar de bateria baixa, em Volts. O protocolo manda mV; convertemos ao comparar. */
    private LOW_BATTERY_VOLTS = 3.0;

    constructor(
        private readonly taskService: TaskService,
        private readonly robotService: RobotService
    ) { }


    onModuleInit() {
        setInterval(async () => {
            
            await this.assignPending().catch(error => {
                console.error("Erro ao atribuir tarefas pendentes:", error);
            });

        }, this.RUN_TIME);
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

    /**
     * Atribuição MANUAL (uso típico: robô SemiAuto). Faz o mesmo que o loop
     * automático de `assignPending`, mas disparado por um humano via rota, não
     * pela fila. Reusa o `sendCommandToRobot` pra montar/enviar os waypoints.
     */
    async assignTaskManually(address: string, taskId: string): Promise<void> {

        const robot = await this.robotService.getByAddress(address);

        if (!robot) {
            throw new NotFoundException(`Nenhum robô com o endereço '${address}'`);
        }

        // Manual é dirigido no joystick; não recebe task. (Auto e SemiAuto podem.)
        if (robot.mode === RobotControlMode.Manual) {
            throw new BadRequestException(`Robô ${address} está em modo Manual`);
        }

        if (robot.taskId) {
            throw new ConflictException(`Robô ${address} já está executando uma task`);
        }

        const task = await this.taskService.getOneTaskWithWaypoints(taskId);

        if (!task) {
            throw new NotFoundException(`Nenhuma task com uuid '${taskId}'`);
        }

        if (!task.waypoints?.length) {
            throw new BadRequestException(`Task ${taskId} não tem waypoints`);
        }

        const sent = await this.sendCommandToRobot(robot, task);

        if (!sent) {
            throw new Error(`Falha ao enviar waypoints para o robô ${address}`);
        }

        await this.taskService.update(task.uuid, { status: TaskStatus.InProgress });

        await this.robotService.update(robot.uuid, { taskId: task.uuid });
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

    async handleRobotLost(payload: {address : string}) : Promise<void>{

        const robot = await this.robotService.getByAddress(payload.address);

        if (!robot || !robot.taskId){
            return
        }

        await this.handleLostRobot(robot)

        console.log(`[ORQ] robô ${payload.address} sumiu → task ${robot.taskId} voltou pra fila`);


    }

    async onAdvertisement( payload : {address : string, data : any}) : Promise<void>{

        const robot = await this.robotService.getByAddress(payload.address);

        if (!robot || !robot.taskId){
            return
        }

        //Verifica bateria baixa (data.battery vem em mV; comparamos em Volts)
        const batteryVolts = payload.data.battery / 1000;

        if (batteryVolts <= this.LOW_BATTERY_VOLTS){

            //To do task de recarregar
            await this.resetTask(robot)
            return
        }

        const task = await this.taskService.getOneTaskWithWaypoints(robot.taskId);

        const howManyWaypoints = task?.waypoints.length ?? 0

        if(payload.data.waypoint_idx >= howManyWaypoints){
            await this.completeTask(robot);
            return
        }

    }


    private async resetTask(robot : RobotModel) : Promise<void>{
       
        const taskId : string = robot.taskId ?? "";
       
        await this.taskService.update(taskId, {status : TaskStatus.Pending});

        await this.robotService.update(robot.uuid, {taskId : null});
    }

    private async completeTask(robot : RobotModel) : Promise<void>{
       
        const taskId : string = robot.taskId ?? "";
       
        await this.taskService.update(taskId, {status : TaskStatus.Completed});

        await this.robotService.update(robot.uuid, {taskId : null});
    }

    private async handleLostRobot(robot : RobotModel) : Promise<void>{
       
        const taskId : string = robot.taskId ?? "";
       
        await this.taskService.update(taskId, {status : TaskStatus.Pending});

        await this.robotService.update(robot.uuid, {taskId : null, status : RobotStatus.Lost});
    }




}


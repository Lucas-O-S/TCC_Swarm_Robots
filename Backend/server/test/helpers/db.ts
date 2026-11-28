import { Sequelize } from 'sequelize-typescript';
import { RobotModel } from 'src/Model/Robot.Model';
import { TaskModel } from 'src/Model/Task.Model';
import { TaskWaypointModel } from 'src/Model/TaskWaypoint.Model';
import { RobotControlMode } from 'src/Enums/RobotControlMode.enum';
import { TaskStatus } from 'src/Enums/TaskStatus.Enum';

/** Endereço do robô usado nos casos de teste. */
export const ROBO = 'AA00000000000001';

const TABELAS = ['users', 'robots', 'tasks', 'task_waypoints', 'position', 'scenario', 'obstacle', 'gateways'];

export async function clearDatabase(sequelize: Sequelize): Promise<void> {
    await sequelize.query(`TRUNCATE TABLE ${TABELAS.join(', ')} RESTART IDENTITY CASCADE`);
}

export async function createRobot(data: Partial<RobotModel> = {}): Promise<RobotModel> {
    return await RobotModel.create({
        address: ROBO,
        name: 'Robô de teste',
        mode: RobotControlMode.Auto,
        ...data,
    } as RobotModel);
}

/**
 * Cria uma task com `waypoints` pontos. A ordem é gravada invertida
 * (orderIndex decrescente) pra o teste conferir que a API manda os pontos
 * ordenados para o robô.
 */
export async function createTask(waypoints: number, status: TaskStatus = TaskStatus.Pending): Promise<TaskModel> {
    const task = await TaskModel.create({ name: `Task com ${waypoints} pontos`, status } as TaskModel);

    const pontos = Array.from({ length: waypoints }, (_, i) => ({
        taskId: task.uuid,
        orderIndex: waypoints - 1 - i,
        x: 100 * (waypoints - i),
        y: 50 * (waypoints - i),
    }));

    if (pontos.length > 0) {
        await TaskWaypointModel.bulkCreate(pontos as TaskWaypointModel[]);
    }

    return task;
}

export async function getRobot(): Promise<RobotModel | null> {
    return await RobotModel.findOne({ where: { address: ROBO } });
}

export async function getTask(uuid: string): Promise<TaskModel | null> {
    return await TaskModel.findByPk(uuid);
}

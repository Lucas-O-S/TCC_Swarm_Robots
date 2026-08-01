import { Column, DataType, Default, HasMany, Table } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";
import { RobotModel } from "./Robot.Model";
import { TaskStatus } from "../Enums/TaskStatus.Enum";
import { TaskWaypointModel } from "./TaskWaypoint.Model";

/**
 * Tasks: conceito da nossa aplicação, não existe no protocolo DotBot
 * (ver AGENTS.md). Um robô pode ficar sem task (recém anunciado na rede),
 * por isso a FK em `robots.task_id` é nullable.
 */
@Table({ tableName: "tasks", underscored: true, paranoid: true })
export class TaskModel extends BaseModel<TaskModel> {

    @Column({ type: DataType.STRING, allowNull: false })
    name: string;

    /** Quanto menor, mais prioritária. Default 0 - não é obrigatório informar. */
    @Default(0)
    @Column({ type: DataType.INTEGER, allowNull: false })
    priority: number;

    /**
     * Task lifecycle. Starts Pending; automation (Orchestrator) marks it
     * InProgress on assignment and Completed when the robot finishes.
     */
    @Default(TaskStatus.Pending)
    @Column({ type: DataType.SMALLINT, allowNull: false })
    status: TaskStatus;

    @HasMany(() => RobotModel)
    robots: RobotModel[];

    /** Pontos do trajeto, em ordem - é o que vira waypoints pro robô. */
    @HasMany(() => TaskWaypointModel)
    waypoints: TaskWaypointModel[];
}

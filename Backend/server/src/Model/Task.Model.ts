import { Column, DataType, HasMany, Table } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";
import { RobotModel } from "./Robot.Model";

/**
 * Tasks: conceito da nossa aplicação, não existe no protocolo DotBot
 * (ver AGENTS.md). Um robô pode ficar sem task (recém anunciado na rede),
 * por isso a FK em `robots.task_id` é nullable.
 */
@Table({ tableName: "tasks", underscored: true, paranoid: true })
export class TaskModel extends BaseModel<TaskModel> {

    @Column({ type: DataType.STRING, allowNull: false })
    name: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    priority: number;

    @HasMany(() => RobotModel)
    robots: RobotModel[];
}

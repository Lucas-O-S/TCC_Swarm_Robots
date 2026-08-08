import { BelongsTo, Column, DataType, ForeignKey, Table } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";
import { TaskModel } from "./Task.Model";

/**
 * Um ponto do trajeto de uma Task (tabela `task_waypoints`). Uma Task tem
 * vários, na ordem definida por `orderIndex`. É o "conteúdo de missão" que o
 * Orchestrator vai mandar pro robô como waypoints. Coordenadas LH2 em mm.
 */
@Table({ tableName: "task_waypoints", underscored: true, paranoid: true })
export class TaskWaypointModel extends BaseModel<TaskWaypointModel> {

    @ForeignKey(() => TaskModel)
    @Column({ type: DataType.UUID, allowNull: false })
    taskId: string;

    @BelongsTo(() => TaskModel)
    task: TaskModel;

    /** Ordem do ponto no trajeto (0 = primeiro). */
    @Column({ type: DataType.INTEGER, allowNull: false })
    orderIndex: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    x: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    y: number;
}

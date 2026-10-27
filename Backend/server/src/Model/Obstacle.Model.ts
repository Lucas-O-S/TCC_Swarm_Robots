import { BelongsTo, Column, DataType, ForeignKey, Table } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";
import { ScenarioModel } from "./Scenario.Model";

/**
 * Obstáculo dentro de um Scenario (tabela `obstacle`). Um Scenario tem vários.
 */
@Table({ tableName: "obstacle", underscored: true, paranoid: true })
export class ObstacleModel extends BaseModel<ObstacleModel> {

    @Column({ type: DataType.STRING, allowNull: false })
    name: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    description: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    sizeX: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    sizeY: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    startPointX: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    startPointY: number;

    @ForeignKey(() => ScenarioModel)
    @Column({ type: DataType.UUID, allowNull: false })
    scenarioId: string;

    @BelongsTo(() => ScenarioModel)
    scenario: ScenarioModel;
}

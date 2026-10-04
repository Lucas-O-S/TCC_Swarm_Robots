import { BelongsTo, Column, DataType, ForeignKey, Table } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";
import { CenarioModel } from "./Cenario.Model";

/**
 * Obstáculo dentro de um Cenário (tabela `obstacle`). Um Cenário tem vários.
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

    @ForeignKey(() => CenarioModel)
    @Column({ type: DataType.UUID, allowNull: false })
    cenarioId: string;

    @BelongsTo(() => CenarioModel)
    cenario: CenarioModel;
}

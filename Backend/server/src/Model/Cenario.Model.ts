import { Column, DataType, HasMany, Table } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";
import { ObstacleModel } from "./Obstacle.Model";

/**
 * Cenário de simulação (área + obstáculos), conceito da nossa aplicação -
 * não existe no protocolo DotBot.
 */
@Table({ tableName: "cenario", underscored: true, paranoid: true })
export class CenarioModel extends BaseModel<CenarioModel> {

    @Column({ type: DataType.STRING, allowNull: false })
    name: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    description: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    sizeX: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    sizeY: number;

    @HasMany(() => ObstacleModel)
    obstacles: ObstacleModel[];
}

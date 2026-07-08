import { BelongsTo, Column, DataType, Default, ForeignKey, Table } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";
import { RobotModel } from "./Robot.Model";
import { PositionSource } from "../Protocol/Enums/PositionSource.enum";

/**
 * Histórico de posição. Uma linha por amostra já "throttled" (o
 * SwarmService descarta amostras muito próximas da última, igual ao
 * `LH2_POSITION_DISTANCE_THRESHOLD` do PyDotBot) - não é gravado a cada
 * pacote bruto recebido do robô.
 */
@Table({ tableName: "position", underscored: true, paranoid: true })
export class PositionModel extends BaseModel<PositionModel> {

    @ForeignKey(() => RobotModel)
    @Column({ type: DataType.UUID, allowNull: false })
    robotId: string;

    @BelongsTo(() => RobotModel)
    robot: RobotModel;

    @Default(PositionSource.LH2)
    @Column({ type: DataType.SMALLINT, allowNull: false })
    source: PositionSource;

    /** LH2: x em mm. GPS: latitude em graus decimais. */
    @Column({ type: DataType.FLOAT, allowNull: false })
    x: number;

    /** LH2: y em mm. GPS: longitude em graus decimais. */
    @Column({ type: DataType.FLOAT, allowNull: false })
    y: number;

    @Column({ type: DataType.INTEGER, allowNull: true })
    direction: number;
}

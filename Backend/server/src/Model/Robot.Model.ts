import { BelongsTo, Column, DataType, Default, ForeignKey, Table } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";
import { TaskModel } from "./Task.Model";
import { RobotStatus } from "./Enums/RobotStatus.enum";
import { RobotApplication } from "../Enums/RobotApplication.enum";
import { RobotControlMode } from "../Enums/RobotControlMode.enum";

@Table({ tableName: "robots", underscored: true, paranoid: true })
export class RobotModel extends BaseModel<RobotModel> {

    /**
     * Endereço físico do rádio (hex). É a chave usada pelo protocolo -
     * todo frame recebido/enviado é endereçado por isto, não pelo uuid.
     */
    @Column({ type: DataType.STRING(16), unique: true, allowNull: false })
    address: string;

    @Column({ type: DataType.STRING, allowNull: false })
    name: string;

    @Default(RobotApplication.DotBot)
    @Column({ type: DataType.SMALLINT, allowNull: false })
    application: RobotApplication;

    /** id do enxame/rede (network_id em hex). */
    @Default("0000")
    @Column({ type: DataType.STRING(8), allowNull: false })
    swarmId: string;

    @Default(RobotStatus.Inactive)
    @Column({ type: DataType.SMALLINT, allowNull: false })
    status: RobotStatus;

    @Default(RobotControlMode.Manual)
    @Column({ type: DataType.SMALLINT, allowNull: false })
    mode: RobotControlMode;

    /** Bitmask de calibração LH2: bit0 = lighthouse 1, bit1 = lighthouse 2. */
    @Default(0)
    @Column({ type: DataType.SMALLINT, allowNull: false })
    calibrated: number;

    /** Tensão da bateria em Volts (o protocolo manda em mV; converta ao gravar). */
    @Default(3.0)
    @Column({ type: DataType.FLOAT, allowNull: false })
    battery: number;


    /** Distância mínima (mm) para considerar que o robô chegou num waypoint. */
    @Default(100)
    @Column({ type: DataType.INTEGER, allowNull: false })
    waypointsThreshold: number;

    @Default(DataType.NOW)
    @Column({ type: DataType.DATE, allowNull: false })
    lastSync: Date;

    /**
     * Nullable: um robô pode existir (acabou de anunciar na rede) sem
     * ainda ter uma tarefa atribuída.
     */
    @ForeignKey(() => TaskModel)
    @Column({ type: DataType.UUID, allowNull: true })
    taskId: string | null;

    @BelongsTo(() => TaskModel)
    task: TaskModel;
}

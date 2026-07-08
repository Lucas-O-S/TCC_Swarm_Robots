import { Column, DataType, Default, Table } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";

/** ApplicationType do protocolo DotBot */
export enum RobotApplication {
    DotBot = 0,
    SailBot = 1,
    Freebot = 2,
    XGO = 3,
    LH2MiniMote = 4,
}

/**
 * DotBotStatus. Valor cacheado: a fonte da verdade é recalculada
 * periodicamente a partir de `lastSync` (ACTIVE < 5s, INACTIVE < 60s,
 * LOST caso contrário), igual ao `_dotbots_status_refresh` do PyDotBot.
 */
export enum RobotStatus {
    Active = 0,
    Inactive = 1,
    Lost = 2,
}

/** ControlModeType do protocolo. */
export enum RobotControlMode {
    Manual = 0,
    Auto = 1,
}

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

    @Column({ type: DataType.INTEGER, allowNull: true })
    direction: number;

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
    @Column({ type: DataType.UUID, allowNull: true })
    taskId: string;
}

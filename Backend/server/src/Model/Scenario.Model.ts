import { BelongsTo, Column, DataType, ForeignKey, HasMany, Table } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";
import { ObstacleModel } from "./Obstacle.Model";
import { GatewayModel } from "./Gateway.Model";

/**
 * Cenário = o mapa de um gateway (área + obstáculos), conceito da nossa
 * aplicação - não existe no protocolo DotBot. Um por gateway, criado e
 * atualizado pela borda (arena:snapshot, ver GatewayService): a área vem dela;
 * o usuário edita nome, descrição e obstáculos. mm no referencial em que os
 * robôs reportam a posição (Y pra baixo, origem no canto superior-esquerdo).
 * Cenários antigos, de antes disso, ficam com gatewayId e área nulos.
 */
@Table({ tableName: "scenario", underscored: true, paranoid: true })
export class ScenarioModel extends BaseModel<ScenarioModel> {

    @Column({ type: DataType.STRING, allowNull: false })
    name: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    description: string;

    /** Largura da área (mm). */
    @Column({ type: DataType.INTEGER, allowNull: false })
    sizeX: number;

    /** Altura da área (mm). */
    @Column({ type: DataType.INTEGER, allowNull: false })
    sizeY: number;

    @HasMany(() => ObstacleModel)
    obstacles: ObstacleModel[];

    @ForeignKey(() => GatewayModel)
    @Column({ type: DataType.UUID, allowNull: true })
    gatewayId: string | null;

    @BelongsTo(() => GatewayModel)
    gateway: GatewayModel;

    /** lh2 = calibração LH2 da borda; config = ARENA_* da borda (sem LH2). */
    @Column({ type: DataType.STRING(8), allowNull: true })
    areaSource: "lh2" | "config" | null;

    /** area = área real da calibração; pydotbot = 5 × o retângulo a partir de (0, 0); config = ARENA_*. */
    @Column({ type: DataType.STRING(10), allowNull: true })
    areaLayout: "area" | "pydotbot" | "config" | null;

    /** Canto superior-esquerdo da área no referencial (mm). */
    @Column({ type: DataType.INTEGER, allowNull: true })
    areaX: number | null;

    @Column({ type: DataType.INTEGER, allowNull: true })
    areaY: number | null;

    /** Retângulo das 4 marcas de calibração no chão (só lh2). */
    @Column({ type: DataType.INTEGER, allowNull: true })
    calibrationX: number | null;

    @Column({ type: DataType.INTEGER, allowNull: true })
    calibrationY: number | null;

    @Column({ type: DataType.INTEGER, allowNull: true })
    calibrationWidth: number | null;

    @Column({ type: DataType.INTEGER, allowNull: true })
    calibrationHeight: number | null;

    @Column({ type: DataType.ARRAY(DataType.INTEGER), allowNull: true })
    calibrationChannels: number[] | null;

    /** created_at da calibração (só lh2). */
    @Column({ type: DataType.STRING(32), allowNull: true })
    calibrationVersion: string | null;

    /** TOML de onde a calibração saiu, na máquina da borda (só lh2). */
    @Column({ type: DataType.STRING(1024), allowNull: true })
    calibrationFile: string | null;
}

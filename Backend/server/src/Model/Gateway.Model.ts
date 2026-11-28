import { Column, DataType, Default, HasOne, Table } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";
import { ScenarioModel } from "./Scenario.Model";
import { GatewayMode } from "src/Enums/GatewayMode.enum";

/**
 * Gateway = uma borda (edgeId) + o transporte dela (mode) + a rede Mari
 * (networkId). Criado sozinho quando a borda conecta no /edge mandando essa
 * identidade. O mapa dele (ScenarioModel) também nasce da borda.
 */
@Table({ tableName: "gateways", underscored: true, paranoid: true })
export class GatewayModel extends BaseModel<GatewayModel> {

    @Column({ type: DataType.STRING, allowNull: false })
    edgeId: string;

    @Column({ type: DataType.STRING(16), allowNull: false })
    mode: GatewayMode;

    /** 4 hex maiúsculos, ex.: "1200". */
    @Column({ type: DataType.STRING(4), allowNull: false })
    networkId: string;

    @Column({ type: DataType.STRING, allowNull: false })
    name: string;

    /** Borda conectada no /edge agora. */
    @Default(false)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    connected: boolean;

    /** Última vez que a borda conectou ou caiu. */
    @Column({ type: DataType.DATE, allowNull: true })
    lastSeen: Date | null;

    @HasOne(() => ScenarioModel)
    scenario: ScenarioModel;
}

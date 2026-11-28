import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { BaseRepository } from "src/Classes/Base/Base.Repository";
import { GatewayModel } from "src/Model/Gateway.Model";
import { EdgeGatewayIdentity } from "src/Classes/Edge/Edge.Types";

@Injectable()
export class GatewayRepository extends BaseRepository<GatewayModel> {

    constructor(@InjectModel(GatewayModel) model: typeof GatewayModel) {
        super(model);
    }

    async getByIdentity({ edgeId, mode, networkId }: EdgeGatewayIdentity): Promise<GatewayModel | null> {
        return await this.model.findOne({ where: { edgeId, mode, networkId } });
    }

    /** Boot do back: ninguém está conectado ainda (o flag do banco pode ser de antes de cair). */
    async markAllDisconnected(): Promise<void> {
        await this.model.update({ connected: false }, { where: { connected: true } });
    }
}

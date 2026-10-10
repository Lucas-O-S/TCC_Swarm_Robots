import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { GATEWAY_ADAPTER } from "src/adapter/GatewayAdapter.interface";
import type { GatewayAdapter } from "src/adapter/GatewayAdapter.interface";
import { Protocol } from "src/Protocols/Protocol";
import { PayloadSelector } from "src/Protocols/PayloadSelector";
import { PayloadType } from "src/Enums/PayloadType.enum";
import { Command } from "src/Enums/Command.enum";

/** Qual payload do protocolo carrega cada comando. */
const PAYLOAD_OF: Record<Command, PayloadType> = {
    [Command.MoveRaw]: PayloadType.CMD_MOVE_RAW,
    [Command.RgbLed]: PayloadType.CMD_RGB_LED,
    [Command.ControlMode]: PayloadType.CONTROL_MODE,
    [Command.Waypoints]: PayloadType.LH2_WAYPOINTS,
    [Command.XgoAction]: PayloadType.CMD_XGO_ACTION,
};

const ADDRESS_REGEX = /^[0-9A-Fa-f]{16}$/;

/**
 * PONTO ÚNICO por onde todo comando sai pro rádio: valida o endereço, escolhe
 * o codec pelo tipo, codifica e entrega ao GatewayAdapter. Se um dia vários
 * sistemas comandarem a borda ao mesmo tempo, a arbitragem entra aqui, sem
 * mudar o contrato das rotas.
 */
@Injectable()
export class CommandService {

    constructor(@Inject(GATEWAY_ADAPTER) private readonly gateway: GatewayAdapter) {}

    send(address: string, command: Command, payload: any) {

        if (!ADDRESS_REGEX.test(address)) {
            throw new BadRequestException(`address deve ter 16 dígitos hexadecimais (recebido '${address}')`);
        }

        const target = Protocol.normalizeAddress(address);
        const payloadType = PAYLOAD_OF[command];

        const codec = PayloadSelector.getPayloadCoder(payloadType);
        if (!codec) {
            throw new Error(`Nenhum codec registrado para o payload type ${payloadType}`);
        }

        this.gateway.send(target, payloadType, codec.encodePayload(payload));

        return { address: target, command, payload };
    }
}

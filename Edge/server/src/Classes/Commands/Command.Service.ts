import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { GATEWAY_ADAPTER } from "src/adapter/GatewayAdapter.interface";
import type { GatewayAdapter } from "src/adapter/GatewayAdapter.interface";
import { Protocol } from "src/Protocols/Protocol";
import { PayloadSelector } from "src/Protocols/PayloadSelector";
import { PayloadType } from "src/Enums/PayloadType.enum";
import { Command } from "src/Enums/Command.enum";
import { ADDRESS_REGEX } from "src/Constants/Address.Constants";
import { Lh2WaypointsPayload } from "src/Protocols/Wrappers/Encode/Lh2WaypointsPayload.wrapper";

/** Qual payload do protocolo carrega cada comando. */
const PAYLOAD_OF: Record<Command, PayloadType> = {
    [Command.MoveRaw]: PayloadType.CMD_MOVE_RAW,
    [Command.RgbLed]: PayloadType.CMD_RGB_LED,
    [Command.ControlMode]: PayloadType.CONTROL_MODE,
    [Command.Waypoints]: PayloadType.LH2_WAYPOINTS,
    [Command.XgoAction]: PayloadType.CMD_XGO_ACTION,
};

/**
 * LH2_WAYPOINTS sem pontos. No firmware 1.23.0 é o único comando que tira o
 * robô do Auto: zera a lista, volta para Manual e para os motores. O
 * CONTROL_MODE sozinho só zera os motores uma vez (não muda o modo nem apaga
 * a rota) e, em Auto, o laço de controle religa no próximo fix da LH2
 * (100 ms) - o robô seguia a rota com a API achando que tinha parado.
 */
const CLEAR_WAYPOINTS: Lh2WaypointsPayload = { threshold: 0, waypoints: [] };

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

        // Contrato do control-mode: para o robô e aborta os waypoints. A rota
        // vazia vai antes, para o CONTROL_MODE ser o último a chegar (nos
        // simuladores é ele que define o modo final).
        if (command === Command.ControlMode) {
            this.deliver(target, PayloadType.LH2_WAYPOINTS, CLEAR_WAYPOINTS);
        }

        this.deliver(target, PAYLOAD_OF[command], payload);

        return { address: target, command, payload };
    }

    /** Codifica pelo tipo e entrega um pacote ao GatewayAdapter. */
    private deliver(target: string, payloadType: PayloadType, payload: any): void {

        const codec = PayloadSelector.getPayloadCoder(payloadType);
        if (!codec) {
            throw new Error(`Nenhum codec registrado para o payload type ${payloadType}`);
        }

        this.gateway.send(target, payloadType, codec.encodePayload(payload));
    }
}

import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import * as GatewayAdapterInterface from "src/adapter/GatewayAdapter.interface";
import { Protocol } from "src/Protocols/Protocol";
import { PayloadSelector } from "src/Protocols/PayloadSelector";
import { RobotWebsockets } from "src/Websockets/Robot.Websockets";

/**
 * Estado "quente" da frota (mirror do Controller.dotbots do PyDotBot): guarda
 * em memória o último dado decodificado de cada robô, por `address`, alimentado
 * pelos frames que chegam do adapter via onFrameReceived. A cada atualização,
 * também empurra o novo estado pro front via WebSocket (RobotWebsockets).
 */
@Injectable()
export class SwarmService implements OnModuleInit {

    private readonly states = new Map<string, any>();

    constructor(
        @Inject(GatewayAdapterInterface.GATEWAY_ADAPTER) private readonly gateway: GatewayAdapterInterface.GatewayAdapter,
        private readonly ws: RobotWebsockets,
    ) {}

    // Registra o handler quando o módulo sobe (não no construtor - é uma ação
    // de "ligar", não de montar).
    onModuleInit(): void {
        this.gateway.onFrameReceived((bytes) => this.handleFrame(bytes));
    }

    /** Frame chegou: desmonta, escolhe o decoder pelo tipo, decodifica e guarda. */
    private handleFrame(bytes: Buffer): void {
        // Frame válido = 18 (header) + 1 (tipo) + corpo. Menos que isso, ignora.
        if (bytes.length < 19) {
            return;
        }

        const frame = Protocol.parseFrame(bytes);

        if (frame.payloadType === null) {
            return; // tipo desconhecido
        }

        const decoder = PayloadSelector.getPayloadDecoder(frame.payloadType);
        if (!decoder) {
            return; // não sabemos decodificar esse tipo (ex.: é um payload de saída)
        }

        const data = decoder.decodePayload(frame.body);

        // Quem mandou = campo `source` do header (offset 10, 8 bytes) -> hex.
        const address = frame.header.readBigUInt64LE(10).toString(16).padStart(16, "0");

        const state = {
            payloadType: frame.payloadType,
            data,
            updatedAt: new Date(),
        };

        this.states.set(address, state);   // guarda no quadro (memória)
        this.ws.emitUpdate(address, state); // empurra pro front ao vivo

        console.log(`[SWARM] estado de ${address} atualizado:`, data);
    }

    /** Último estado conhecido de um robô (ou null se nunca chegou nada dele). */
    getState(address: string): any | null {
        return this.states.get(address) ?? null;
    }

    /** Estado de toda a frota. */
    getAll(): Record<string, any> {
        return Object.fromEntries(this.states);
    }
}

import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import * as GatewayAdapterInterface from "src/adapter/GatewayAdapter.interface";
import { Protocol } from "src/Protocols/Protocol";
import { PayloadSelector } from "src/Protocols/PayloadSelector";
import { RobotWebsockets } from "src/Websockets/Robot.Websockets";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EventsCommands as EventCommands } from "src/Enums/Events.Enum";
import { PayloadType } from "src/Enums/PayloadType.enum";

/**
 * Último estado conhecido de um robô, guardado em memória pelo SwarmService.
 * Tipar isto (em vez de `any` no Map) faz o TS pegar erro de campo - foi um
 * `updateAt` sem "d" que passou batido quando o Map era `any`.
 */
class RobotState {
    constructor(
        public readonly payloadType: PayloadType,
        public readonly data: any,
        public readonly updatedAt: Date = new Date(),
    ) {}
}

/**
 * Estado "quente" da frota (mirror do Controller.dotbots do PyDotBot): guarda
 * em memória o último dado decodificado de cada robô, por `address`, alimentado
 * pelos frames que chegam do adapter via onFrameReceived. A cada atualização,
 * também empurra o novo estado pro front via WebSocket (RobotWebsockets).
 */
@Injectable()
export class SwarmService implements OnModuleInit {

    private readonly states = new Map<string, RobotState>();

    private readonly LOST_LIMIT = 5000;

    private readonly RUN_TIME = 1000;

    private readonly lostRobots = new Set<string>();


    constructor(
        @Inject(GatewayAdapterInterface.GATEWAY_ADAPTER) private readonly gateway: GatewayAdapterInterface.GatewayAdapter,
        private readonly ws: RobotWebsockets,
        private readonly events : EventEmitter2
    ) {}

    // Registra o handler quando o módulo sobe (não no construtor - é uma ação
    // de "ligar", não de montar).
    onModuleInit(): void {
   
        this.gateway.onFrameReceived((bytes) => this.handleFrame(bytes));
   
        setInterval(() => this.checkLost(), this.RUN_TIME)

    }


    private checkLost() : void {
        
        const now = Date.now();

        for (const [address, state] of this.states){
        
            const silentTime = now - state.updatedAt.getTime();

            if(
                silentTime > this.LOST_LIMIT
                && !this.lostRobots.has(address)
            ){
                
                this.lostRobots.add(address);

                this.events.emit(EventCommands.lost, {address});

                console.log(`[SWARM] robô ${address} virou Lost`);

            }

            if (silentTime <= this.LOST_LIMIT){
                this.lostRobots.delete(address);
            }

        }



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

        const state = new RobotState(frame.payloadType, data);

        this.states.set(address, state);   // guarda no quadro (memória)
        this.ws.emitUpdate(address, state); // empurra pro front ao vivo


        //Gera o evento de advertisement
        this.events.emit( EventCommands.advertisement, { address, data });

        console.log(`[SWARM] estado de ${address} atualizado:`, data);
    }

    /** Último estado conhecido de um robô (ou null se nunca chegou nada dele). */
    getState(address: string): RobotState | null {
        return this.states.get(address) ?? null;
    }

    /** Estado de toda a frota. */
    getAll(): Record<string, RobotState> {
        return Object.fromEntries(this.states);
    }
}

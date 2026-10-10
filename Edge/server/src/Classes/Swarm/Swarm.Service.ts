import { Inject, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { GATEWAY_ADAPTER } from "src/adapter/GatewayAdapter.interface";
import type { GatewayAdapter } from "src/adapter/GatewayAdapter.interface";
import { Protocol } from "src/Protocols/Protocol";
import { PayloadSelector } from "src/Protocols/PayloadSelector";
import { PayloadType } from "src/Enums/PayloadType.enum";
import { RobotStatus } from "src/Enums/RobotStatus.enum";
import { PositionSource } from "src/Enums/PositionSource.enum";
import { EdgeWebsockets } from "src/Websockets/Edge.Websockets";
import { RobotPosition, RobotSnapshot, RobotState } from "./Robot.State";

/**
 * Estado "quente" da frota visto pela borda (mirror do Controller.dotbots do
 * PyDotBot): último dado decodificado de cada robô, por `address`, alimentado
 * pelos frames que chegam do adapter. Tudo em memória - a borda não tem banco;
 * se ela reiniciar, o quadro se refaz com os próximos anúncios.
 *
 * O que é do DISPOSITIVO fica aqui (decodificar, saber quem está vivo, extrair
 * posição). O que é de NEGÓCIO (cadastro, histórico, tasks) é de quem consome
 * os eventos - hoje a API do front.
 */
@Injectable()
export class SwarmService implements OnModuleInit, OnModuleDestroy {

    private readonly states = new Map<string, RobotState>();

    private readonly statuses = new Map<string, RobotStatus>();

    private readonly knownRobots = new Set<string>();

    private readonly RUN_TIME = 1000;

    // Limiares de status por tempo de silêncio (iguais ao PyDotBot:
    // INACTIVE_DELAY=5s, LOST_DELAY=60s). < 5s = Active, 5-60s = Inactive,
    // > 60s = Lost. Calculado do último frame, nunca vem do robô.
    private readonly INACTIVE_AFTER_MS = 5000;

    private readonly LOST_AFTER_MS = 60000;

    private timer: NodeJS.Timeout | null = null;

    constructor(
        @Inject(GATEWAY_ADAPTER) private readonly gateway: GatewayAdapter,
        private readonly ws: EdgeWebsockets,
    ) {}

    onModuleInit(): void {
        this.gateway.onFrameReceived((bytes) => this.handleFrame(bytes));
        this.timer = setInterval(() => this.refreshStatus(), this.RUN_TIME);
    }

    onModuleDestroy(): void {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    /** Status a partir do tempo de silêncio (mesma regra do PyDotBot). */
    private statusFromSilence(silentMs: number): RobotStatus {
        if (silentMs > this.LOST_AFTER_MS) return RobotStatus.Lost;
        if (silentMs > this.INACTIVE_AFTER_MS) return RobotStatus.Inactive;
        return RobotStatus.Active;
    }

    /** Recalcula o status de cada robô e avisa (robot:status) só quando muda. */
    private refreshStatus(): void {
        const now = Date.now();

        for (const [address, state] of this.states) {
            const status = this.statusFromSilence(now - state.updatedAt.getTime());
            const last = this.statuses.get(address);

            if (last === status) continue;

            this.statuses.set(address, status);
            this.ws.emitStatus({ address, status, lastSync: state.updatedAt });

            if (last !== undefined) {
                console.log(`[SWARM] status de ${address}: ${RobotStatus[last]} → ${RobotStatus[status]}`);
            }
        }
    }

    /** Frame chegou: desmonta, escolhe o decoder pelo tipo, decodifica e publica. */
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
        const address = Protocol.readAddress(frame.header, 10);

        const state = new RobotState(address, frame.payloadType, data, this.positionOf(frame.payloadType, data));

        this.states.set(address, state);

        if (frame.payloadType === PayloadType.DOTBOT_ADVERTISEMENT && !this.knownRobots.has(address)) {
            this.knownRobots.add(address);
            this.ws.emitJoined({ address });
            console.log(`[SWARM] robô ${address} entrou na rede`);
        }

        this.ws.emitState(state);
    }

    /**
     * Extrai a posição do payload, se ele carregar uma. LH2 (DotBot) vem em mm;
     * GPS (SailBot) em graus. Sentinelas de "sem leitura" viram null aqui, para
     * nenhum cliente precisar conhecê-las.
     */
    private positionOf(payloadType: PayloadType, data: any): RobotPosition | null {

        if (payloadType === PayloadType.DOTBOT_ADVERTISEMENT) {
            // 0xFFFFFFFF = "sem leitura de posição" (robô ainda não localizado).
            if (data.pos_x === 0xFFFFFFFF || data.pos_y === 0xFFFFFFFF) {
                return null;
            }
            return {
                source: PositionSource.LH2,
                x: data.pos_x,
                y: data.pos_y,
                // 0xFFFF (sem leitura) vira -1 no decode com sinal.
                direction: data.direction === -1 ? null : data.direction,
            };
        }

        if (payloadType === PayloadType.GPS_POSITION) {
            return {
                source: PositionSource.GPS,
                x: data.latitude / 1e6,   // graus decimais
                y: data.longitude / 1e6,
                direction: null,
            };
        }

        return null; // payload sem posição
    }

    private snapshotOf(address: string, state: RobotState): RobotSnapshot {
        // Robô que acabou de mandar o 1º frame ainda não passou pelo ciclo de
        // status: se tem frame, está Active.
        return { address, status: this.statuses.get(address) ?? RobotStatus.Active, state };
    }

    /** Último estado conhecido de um robô; 404 se a borda nunca ouviu ele. */
    getSnapshot(address: string): RobotSnapshot {
        const key = Protocol.normalizeAddress(address);
        const state = this.states.get(key);
        if (!state) {
            throw new NotFoundException(`A borda nunca recebeu nada do robô '${address}'`);
        }
        return this.snapshotOf(key, state);
    }

    /** Estado de toda a frota. */
    getAll(): RobotSnapshot[] {
        return [...this.states].map(([address, state]) => this.snapshotOf(address, state));
    }
}

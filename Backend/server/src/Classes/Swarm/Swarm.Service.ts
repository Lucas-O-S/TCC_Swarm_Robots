import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { RobotWebsockets } from "src/Websockets/Robot.Websockets";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EventsCommands as EventCommands } from "src/Enums/Events.Enum";
import { RobotService } from "../Robots/Robot.Service";
import { RobotStatus } from "src/Enums/RobotStatus.enum";
import { PositionService } from "../Positions/Position.Service";
import { PositionSource } from "src/Enums/PositionSource.enum";
import { PositionModel } from "src/Model/Position.Model";
import { EdgeClient } from "../Edge/Edge.Client";
import { DOTBOT_ADVERTISEMENT, EdgeRobotPosition, EdgeRobotState, EdgeRobotStatusEvent } from "../Edge/Edge.Types";
import { normalizeAddress } from "src/Helpers/Address";

/**
 * Último estado conhecido de um robô, guardado em memória pelo SwarmService.
 * Tipar isto (em vez de `any` no Map) faz o TS pegar erro de campo - foi um
 * `updateAt` sem "d" que passou batido quando o Map era `any`.
 * É também o `state` que vai pro front no robot:update.
 */
class RobotState {
    constructor(
        public readonly payloadType: number,
        public readonly data: any,
        public readonly updatedAt: Date = new Date(),
    ) {}
}

/**
 * Lado de NEGÓCIO da frota: consome o que a borda publica (robot:state e
 * robot:status, via EdgeClient) e cuida do que é da API - cadastro automático
 * no banco, histórico de posição, status/bateria persistidos, eventos internos
 * pro Orchestrator e o robot:update/status/new pro front.
 *
 * Decodificar frame, calcular status por silêncio e extrair posição agora é
 * trabalho da borda (Edge/server/src/Classes/Swarm/Swarm.Service.ts).
 */
@Injectable()
export class SwarmService implements OnModuleInit, OnModuleDestroy {

    private readonly states = new Map<string, RobotState>();

    // Último status que a borda informou por address.
    private readonly statuses = new Map<string, RobotStatus>();

    private readonly RUN_TIME = 1000;

    private readonly lostRobots = new Set<string>();

    private readonly knownRobots = new Set<string>();

    // Último {status, bateria} que gravamos no banco por address. Serve de
    // throttle: só escrevemos quando muda de verdade (não a cada pacote).
    private readonly persisted = new Map<string, { status: RobotStatus; battery: number }>();

    // Última posição gravada por address, pro throttle por distância abaixo.
    private readonly lastPosition = new Map<string, { x: number; y: number }>();

    // Limiares de distância pra gravar uma nova amostra de posição (iguais ao
    // PyDotBot: LH2_POSITION_DISTANCE_THRESHOLD=20mm, GPS=5m). Se moveu menos
    // que isso, é considerado ruído e a amostra é descartada.
    private readonly LH2_DISTANCE_MM = 20;

    private readonly GPS_DISTANCE_M = 5;

    private timer: NodeJS.Timeout | null = null;


    constructor(
        private readonly edge: EdgeClient,
        private readonly ws: RobotWebsockets,
        private readonly events : EventEmitter2,
        private readonly robots : RobotService,
        private readonly positions : PositionService
    ) {}

    // Registra os handlers quando o módulo sobe (não no construtor - é uma
    // ação de "ligar", não de montar).
    onModuleInit(): void {

        this.edge.onState((state) => this.handleState(state));

        this.edge.onStatus((event) => this.handleStatus(event));

        this.timer = setInterval(() => {
            this.refreshAndPersist().catch(error =>
                console.error("[SWARM] erro ao persistir estado:", error),
            );
        }, this.RUN_TIME);

    }

    onModuleDestroy(): void {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }


    /** Bateria em Volts se o payload tiver esse campo (mV/1000), senão null. */
    private batteryVoltsOf(state: RobotState): number | null {
        const raw = state.data?.battery;
        return typeof raw === "number" ? raw / 1000 : null;
    }

    /**
     * Único escritor no Postgres. Roda a cada RUN_TIME: pra cada robô no estado
     * quente, pega o status que a borda calculou e grava status/battery/lastSync -
     * mas SÓ quando status ou bateria mudam desde a última gravação (throttle).
     * Assim vários pacotes viram no máximo 1 write/robô/ciclo, e nada se o robô
     * está parado. Espelha o _dotbots_status_refresh do PyDotBot.
     */
    private async refreshAndPersist(): Promise<void> {

        for (const [address, state] of this.states) {

            // Sem status ainda = acabou de chegar o 1º frame: está Active.
            const status = this.statuses.get(address) ?? RobotStatus.Active;

            const batteryVolts = this.batteryVoltsOf(state);

            const last = this.persisted.get(address);

            const statusChanged = !last || last.status !== status;

            const batteryChanged = batteryVolts !== null && (!last || last.battery !== batteryVolts);

            if (!statusChanged && !batteryChanged) {
                continue;
            }

            const robot = await this.robots.getByAddress(address);

            if (!robot) {
                continue; // anunciou na rede mas não está cadastrado no banco
            }

            const changes: { status?: RobotStatus; battery?: number; lastSync: Date } = {
                lastSync: state.updatedAt,
            };

            if (statusChanged) changes.status = status;

            if (batteryChanged) changes.battery = batteryVolts as number;

            await this.robots.update(robot.uuid, changes);

            this.persisted.set(address, {
                status,
                battery: batteryVolts ?? last?.battery ?? robot.battery,
            });

            if (statusChanged) {
                this.ws.emitStatus(address, status);
                console.log(`[SWARM] status de ${address}: ${RobotStatus[last?.status ?? robot.status]} → ${RobotStatus[status]}`);
            }
        }
    }


    private async verifyCreateRobot(address: string): Promise<void> {
        if (this.knownRobots.has(address)) {
            return;
        }

        // Marca antes do await: vários estados do mesmo robô chegando juntos não
        // disparam vários findOrCreate.
        this.knownRobots.add(address);

        await this.robots.findOrCreateByAddress(address, { name: `DotBot-${address}`, status: RobotStatus.Active })
        .then(([robot, created]) => {

            if (created) {

                console.log(`[SWARM] robô ${address} criado no banco`);

                this.ws.emitNew(robot);

            }
        })
        .catch(error => {

            this.knownRobots.delete(address);

            console.error(`[SWARM] erro ao criar robô ${address}:`, error);
        });
    }


    /**
     * Status que a borda calculou pelo silêncio. Saiu de Active (>5 s sem
     * frame) = evento interno `lost`, uma vez por período de silêncio - o
     * Orchestrator solta a task. Voltou pra Active = pode perder de novo.
     */
    private handleStatus(event: EdgeRobotStatusEvent): void {

        const address = normalizeAddress(event.address);

        this.statuses.set(address, event.status);

        if (event.status === RobotStatus.Active) {
            this.lostRobots.delete(address);
            return;
        }

        if (!this.lostRobots.has(address)) {

            this.lostRobots.add(address);

            this.events.emit(EventCommands.lost, { address });

            console.log(`[SWARM] robô ${address} virou Lost`);
        }
    }


    /** Estado novo chegou da borda: cadastra se preciso, guarda, avisa o front e o Orchestrator. */
    private handleState(edgeState: EdgeRobotState): void {

        const address = normalizeAddress(edgeState.address);

        if (edgeState.type === DOTBOT_ADVERTISEMENT) {
            this.verifyCreateRobot(address);
        }

        const state = new RobotState(edgeState.payloadType, edgeState.data, new Date(edgeState.updatedAt));

        this.states.set(address, state);   // guarda no quadro (memória)
        this.ws.emitUpdate(address, state); // empurra pro front ao vivo

        // Grava a posição no histórico (throttled por distância). Fire-and-forget:
        // não queremos travar o processamento por um write no banco.
        this.persistPosition(address, edgeState.position).catch(error =>
            console.error("[SWARM] erro ao gravar posição:", error),
        );


        //Gera o evento de advertisement
        this.events.emit( EventCommands.advertisement, { address, data: edgeState.data });

        console.log(`[SWARM] estado de ${address} atualizado:`, edgeState.data);
    }

    /**
     * Grava uma amostra de posição na tabela `position`, se a borda mandou
     * posição e o robô tiver se movido o suficiente (throttle por distância,
     * igual ao PyDotBot). LH2 vem em mm; GPS em graus. A borda já descartou as
     * leituras inválidas (position = null).
     */
    private async persistPosition(address: string, position: EdgeRobotPosition | null): Promise<void> {

        if (!position) {
            return; // payload sem posição (ou sem leitura)
        }

        const { source, x, y, direction } = position;

        // Throttle por distância: descarta amostra muito perto da última.
        const last = this.lastPosition.get(address);
        if (last) {

            const moved = source === PositionSource.GPS
                ? this.gpsDistanceMeters(last.x, last.y, x, y)
                : Math.hypot(x - last.x, y - last.y);

            const threshold = source === PositionSource.GPS ? this.GPS_DISTANCE_M : this.LH2_DISTANCE_MM;

            if (moved < threshold) {
                return;
            }
        }

        const robot = await this.robots.getByAddress(address);
        if (!robot) {
            return; // anunciou na rede mas não está cadastrado no banco
        }

        const sample: Partial<PositionModel> = { robotId: robot.uuid, source, x, y };
        if (direction !== null) {
            sample.direction = direction;
        }

        await this.positions.create(sample);

        this.lastPosition.set(address, { x, y });
    }

    /** Distância entre duas coordenadas GPS em metros (haversine, igual PyDotBot). */
    private gpsDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {

        const R = 6371000; // raio da Terra em metros

        const toRad = (deg: number) => (deg * Math.PI) / 180;

        const dLat = toRad(lat2 - lat1);

        const dLon = toRad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

        return 2 * R * Math.asin(Math.sqrt(a));
    }

    /** Último estado conhecido de um robô (ou null se nunca chegou nada dele). */
    getState(address: string): RobotState | null {
        return this.states.get(normalizeAddress(address)) ?? null;
    }

    /** Estado de toda a frota. */
    getAll(): Record<string, RobotState> {
        return Object.fromEntries(this.states);
    }
}

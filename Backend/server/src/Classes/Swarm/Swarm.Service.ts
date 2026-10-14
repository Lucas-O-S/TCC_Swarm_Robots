import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
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
import { RobotUpdateEvent } from "src/Websockets/Socket.Events";
import { RobotModel } from "src/Model/Robot.Model";

/**
 * Último estado conhecido de um robô, guardado em memória pelo SwarmService.
 * Tipar isto (em vez de `any` no Map) faz o TS pegar erro de campo - foi um
 * `updateAt` sem "d" que passou batido quando o Map era `any`.
 * É o que o `GET /robots/:address/status` devolve; pro front no robot:update
 * vai convertido em `RobotUpdateEvent` (ver `toUpdateEvent`).
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

    // Variação mínima de bateria (V) pra regravar no banco: a leitura oscila
    // alguns mV a cada pacote, e sem isso todo robô gravava todo ciclo.
    private readonly BATTERY_DELTA_V = 0.05;

    // address → uuid no banco. O uuid não muda, então é resolvido uma vez e o
    // caminho quente (posição, status) não faz SELECT por amostra.
    private readonly robotUuids = new Map<string, string>();

    // Amostras de posição esperando o próximo ciclo: um INSERT em lote a cada
    // RUN_TIME em vez de um por amostra.
    private pendingPositions: Partial<PositionModel>[] = [];

    // Ciclo do refreshAndPersist ainda rodando: o próximo tick pula em vez de
    // sobrepor (com muitos robôs um ciclo pode passar de RUN_TIME).
    private persisting = false;

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
            this.flushPositions().catch(error =>
                console.error("[SWARM] erro ao gravar posições:", error),
            );
        }, this.RUN_TIME);

    }

    onModuleDestroy(): void {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.flushPositions().catch(error =>
            console.error("[SWARM] erro ao gravar posições:", error),
        );
    }


    /** Bateria em Volts se o payload tiver esse campo (mV/1000), senão null. */
    private batteryVoltsOf(state: RobotState): number | null {
        const raw = state.data?.battery;
        return typeof raw === "number" ? raw / 1000 : null;
    }

    /**
     * Único escritor no Postgres. Roda a cada RUN_TIME: pra cada robô no estado
     * quente, pega o status que a borda calculou e grava status/battery/lastSync -
     * mas SÓ quando o status muda ou a bateria varia BATTERY_DELTA_V (throttle).
     * Assim vários pacotes viram no máximo 1 write/robô/ciclo, e nada se o robô
     * está parado. Espelha o _dotbots_status_refresh do PyDotBot. Um robô com
     * erro não interrompe os outros.
     */
    private async refreshAndPersist(): Promise<void> {

        if (this.persisting) {
            return;
        }

        this.persisting = true;

        try {
            for (const [address, state] of this.states) {
                await this.persistRobot(address, state).catch(error =>
                    console.error(`[SWARM] erro ao persistir ${address}:`, error),
                );
            }
        } finally {
            this.persisting = false;
        }
    }

    private async persistRobot(address: string, state: RobotState): Promise<void> {

        // Sem status ainda = acabou de chegar o 1º frame: está Active.
        const status = this.statuses.get(address) ?? RobotStatus.Active;

        const batteryVolts = this.batteryVoltsOf(state);

        const last = this.persisted.get(address);

        const statusChanged = !last || last.status !== status;

        const batteryChanged = batteryVolts !== null
            && (!last || Math.abs(last.battery - batteryVolts) >= this.BATTERY_DELTA_V);

        if (!statusChanged && !batteryChanged) {
            return;
        }

        const uuid = await this.robotUuidOf(address);

        if (!uuid) {
            return; // anunciou na rede mas não está cadastrado no banco
        }

        const changes: { status?: RobotStatus; battery?: number; lastSync: Date } = {
            lastSync: state.updatedAt,
        };

        if (statusChanged) changes.status = status;

        if (batteryChanged) changes.battery = batteryVolts as number;

        let robot: RobotModel;

        try {
            robot = await this.robots.update(uuid, changes);
        } catch (error) {
            if (error instanceof NotFoundException) {
                this.forgetRobot(address); // apagado do banco: resolve de novo na próxima
                return;
            }
            throw error;
        }

        this.persisted.set(address, {
            status,
            battery: batteryChanged ? (batteryVolts as number) : (last?.battery ?? robot.battery),
        });

        if (statusChanged) {
            this.ws.emitStatus(address, status);
            console.log(`[SWARM] status de ${address}: ${last ? RobotStatus[last.status] : "?"} → ${RobotStatus[status]}`);
        }
    }

    /** uuid do robô no banco pelo address, com cache (null = não cadastrado). */
    private async robotUuidOf(address: string): Promise<string | null> {

        const cached = this.robotUuids.get(address);

        if (cached) {
            return cached;
        }

        const robot = await this.robots.getByAddress(address);

        if (robot) {
            this.robotUuids.set(address, robot.uuid);
        }

        return robot?.uuid ?? null;
    }

    /** Esquece o que foi cacheado de um robô que sumiu do banco. */
    private forgetRobot(address: string): void {
        this.robotUuids.delete(address);
        this.knownRobots.delete(address);
        this.persisted.delete(address);
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

            this.robotUuids.set(address, robot.uuid);

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
        this.ws.queueUpdate(this.toUpdateEvent(address, state, edgeState.position)); // vai pro front no próximo lote

        // Grava a posição no histórico (throttled por distância). Fire-and-forget:
        // não queremos travar o processamento por um write no banco.
        this.persistPosition(address, edgeState.position).catch(error =>
            console.error("[SWARM] erro ao gravar posição:", error),
        );


        //Gera o evento de advertisement
        this.events.emit( EventCommands.advertisement, { address, data: edgeState.data });
    }

    /**
     * Estado cru da borda → item do `robot:updates` do front: posição já tratada pela
     * borda (sem sentinela), bateria em Volts e nomes iguais ao RobotModel, pra
     * o front não precisar conhecer payloadType nem unidade do fio.
     */
    private toUpdateEvent(address: string, state: RobotState, position: EdgeRobotPosition | null): RobotUpdateEvent {

        const waypointIdx = state.data?.waypoint_idx;

        return {
            address,
            position,
            battery: this.batteryVoltsOf(state),
            waypointIdx: typeof waypointIdx === "number" ? waypointIdx : null,
            updatedAt: state.updatedAt.toISOString(),
        };
    }

    /**
     * Enfileira uma amostra pra tabela `position` (gravada em lote no próximo
     * ciclo, ver flushPositions), se a borda mandou
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

        // Marca antes do await: amostras que chegam enquanto o uuid é resolvido
        // já comparam com esta (senão o throttle deixava passar duplicadas).
        this.lastPosition.set(address, { x, y });

        const robotId = await this.robotUuidOf(address);
        if (!robotId) {
            return; // anunciou na rede mas não está cadastrado no banco
        }

        const sample: Partial<PositionModel> = { robotId, source, x, y };
        if (direction !== null) {
            sample.direction = direction;
        }

        this.pendingPositions.push(sample); // gravada no próximo flushPositions
    }

    /** Grava num INSERT só as amostras acumuladas desde o último ciclo. */
    private async flushPositions(): Promise<void> {

        if (this.pendingPositions.length === 0) {
            return;
        }

        const batch = this.pendingPositions;
        this.pendingPositions = [];

        await this.positions.createMany(batch);
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

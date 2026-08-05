import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import * as GatewayAdapterInterface from "src/adapter/GatewayAdapter.interface";
import { Protocol } from "src/Protocols/Protocol";
import { PayloadSelector } from "src/Protocols/PayloadSelector";
import { RobotWebsockets } from "src/Websockets/Robot.Websockets";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EventsCommands as EventCommands } from "src/Enums/Events.Enum";
import { PayloadType } from "src/Enums/PayloadType.enum";
import { RobotService } from "../Robots/Robot.Service";
import { RobotStatus } from "src/Enums/RobotStatus.enum";
import { PositionService } from "../Positions/Position.Service";
import { PositionSource } from "src/Enums/PositionSource.enum";
import { PositionModel } from "src/Model/Position.Model";

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

    private readonly knownRobots = new Set<string>();

    // Limiares de status por tempo de silêncio (iguais ao PyDotBot:
    // INACTIVE_DELAY=5s, LOST_DELAY=60s). < 5s = Active, 5-60s = Inactive,
    // > 60s = Lost. Calculado do lastSync, nunca vem do robô.
    private readonly INACTIVE_AFTER_MS = 5000;

    private readonly LOST_AFTER_MS = 60000;

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


    constructor(
        @Inject(GatewayAdapterInterface.GATEWAY_ADAPTER) private readonly gateway: GatewayAdapterInterface.GatewayAdapter,
        private readonly ws: RobotWebsockets,
        private readonly events : EventEmitter2,
        private readonly robots : RobotService,
        private readonly positions : PositionService
    ) {}

    // Registra o handler quando o módulo sobe (não no construtor - é uma ação
    // de "ligar", não de montar).
    onModuleInit(): void {
   
        this.gateway.onFrameReceived((bytes) => this.handleFrame(bytes));

        setInterval(() => {
            this.checkLost();
            this.refreshAndPersist().catch(error =>
                console.error("[SWARM] erro ao persistir estado:", error),
            );
        }, this.RUN_TIME)

    }


    /** Status a partir do tempo de silêncio (mesma régra do PyDotBot). */
    private statusFromSilence(silentMs: number): RobotStatus {
        if (silentMs > this.LOST_AFTER_MS) return RobotStatus.Lost;
        if (silentMs > this.INACTIVE_AFTER_MS) return RobotStatus.Inactive;
        return RobotStatus.Active;
    }

    /** Bateria em Volts se o payload tiver esse campo (mV/1000), senão null. */
    private batteryVoltsOf(state: RobotState): number | null {
        const raw = state.data?.battery;
        return typeof raw === "number" ? raw / 1000 : null;
    }

    /**
     * Único escritor no Postgres. Roda a cada RUN_TIME: pra cada robô no estado
     * quente, recalcula o status por lastSync e grava status/battery/lastSync -
     * mas SÓ quando status ou bateria mudam desde a última gravação (throttle).
     * Assim vários pacotes viram no máximo 1 write/robô/ciclo, e nada se o robô
     * está parado. Espelha o _dotbots_status_refresh do PyDotBot.
     */
    private async refreshAndPersist(): Promise<void> {

        const now = Date.now();

        for (const [address, state] of this.states) {

            const silentMs = now - state.updatedAt.getTime();

            const status = this.statusFromSilence(silentMs);

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


    private async verifyCreateRobot(address: string, payloadType : PayloadType): Promise<void> {
        if (!this.knownRobots.has(address) && payloadType === PayloadType.DOTBOT_ADVERTISEMENT) {

            
            await this.robots.findOrCreateByAddress(address, { name: `DotBot-${address}`, status: RobotStatus.Active })
            .then(([robot, created]) => {
                
                this.knownRobots.add(address); 

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

        this.verifyCreateRobot(address, frame.payloadType);

  

        
        const state = new RobotState(frame.payloadType, data);

        this.states.set(address, state);   // guarda no quadro (memória)
        this.ws.emitUpdate(address, state); // empurra pro front ao vivo

        // Grava a posição no histórico (throttled por distância). Fire-and-forget:
        // não queremos travar o processamento do frame por um write no banco.
        this.persistPosition(address, frame.payloadType, data).catch(error =>
            console.error("[SWARM] erro ao gravar posição:", error),
        );


        //Gera o evento de advertisement
        this.events.emit( EventCommands.advertisement, { address, data });

        console.log(`[SWARM] estado de ${address} atualizado:`, data);
    }

    /**
     * Grava uma amostra de posição na tabela `position`, se o payload carregar
     * posição e o robô tiver se movido o suficiente (throttle por distância,
     * igual ao PyDotBot). LH2 (DotBot) vem em mm; GPS (SailBot) em graus.
     */
    private async persistPosition(address: string, payloadType: PayloadType, data: any): Promise<void> {

        let source: PositionSource;
        let x: number;
        let y: number;
        let direction: number | null = null;

        if (payloadType === PayloadType.DOTBOT_ADVERTISEMENT) {
            // 0xFFFFFFFF = "sem leitura de posição" (robô ainda não localizado).
            if (data.pos_x === 0xFFFFFFFF || data.pos_y === 0xFFFFFFFF) {
                return;
            }
            source = PositionSource.LH2;
            x = data.pos_x;
            y = data.pos_y;
            // 0xFFFF (sem leitura) vira -1 no decode com sinal.
            direction = data.direction === -1 ? null : data.direction;

        } else if (payloadType === PayloadType.GPS_POSITION) {
            source = PositionSource.GPS;
            x = data.latitude / 1e6;   // graus decimais
            y = data.longitude / 1e6;
        } else {
            return; // payload sem posição
        }

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
        return this.states.get(address) ?? null;
    }

    /** Estado de toda a frota. */
    getAll(): Record<string, RobotState> {
        return Object.fromEntries(this.states);
    }
}

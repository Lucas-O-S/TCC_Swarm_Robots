import { Injectable, OnModuleInit } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BaseService } from "src/Classes/Base/Base.Service";
import { EdgeClient } from "src/Classes/Edge/Edge.Client";
import { EdgeArenaView, EdgeGatewayIdentity } from "src/Classes/Edge/Edge.Types";
import { ScenarioAreaFields, ScenarioService } from "src/Classes/Scenario/Scenario.Service";
import { EventsCommands } from "src/Enums/Events.Enum";
import { GatewayModel } from "src/Model/Gateway.Model";
import { ScenarioModel } from "src/Model/Scenario.Model";
import { GatewayRepository } from "./Gateway.Repository";

const round = (n: number | undefined | null): number | null => (n === undefined || n === null ? null : Math.round(n));

/**
 * Gateways e o mapa (cenário) de cada um, alimentados pela borda: o gateway
 * nasce (ou volta) quando a borda conecta com a identidade no handshake, e a
 * área que ela manda (arena:snapshot) cria ou atualiza o cenário dele. O
 * front lê por REST e recebe `scenario:updated` quando a área muda.
 */
@Injectable()
export class GatewayService extends BaseService<GatewayModel> implements OnModuleInit {

    // Um evento da borda por vez: o arena:snapshot chega logo atrás do connect
    // e os dois procuram/criam o mesmo gateway.
    private queue: Promise<unknown> = Promise.resolve();

    constructor(
        private readonly gatewayRepository: GatewayRepository,
        private readonly scenarios: ScenarioService,
        private readonly edge: EdgeClient,
        private readonly events: EventEmitter2,
    ) {
        super(gatewayRepository);
    }

    async onModuleInit(): Promise<void> {
        this.edge.onGatewayUp((identity) => this.enqueue(() => this.gatewayUp(identity)));
        this.edge.onGatewayDown((identity) => this.enqueue(() => this.gatewayDown(identity)));
        this.edge.onArena((identity, arena) => this.enqueue(() => this.saveArena(identity, arena)));

        await this.gatewayRepository.markAllDisconnected().catch((error) =>
            console.error("[GATEWAY] não consegui zerar o connected no boot:", error.message ?? error),
        );
    }

    /** Borda conectou: cria o gateway na primeira vez, senão marca como conectado. */
    async gatewayUp(identity: EdgeGatewayIdentity): Promise<GatewayModel> {
        const gateway = await this.findOrCreate(identity);
        await this.gatewayRepository.update({ connected: true, lastSeen: new Date() }, gateway.uuid);
        console.log(`[GATEWAY] ${GatewayService.label(identity)} conectado`);
        return gateway;
    }

    async gatewayDown(identity: EdgeGatewayIdentity): Promise<void> {
        const gateway = await this.gatewayRepository.getByIdentity(identity);
        if (!gateway) return;
        await this.gatewayRepository.update({ connected: false, lastSeen: new Date() }, gateway.uuid);
        console.warn(`[GATEWAY] ${GatewayService.label(identity)} desconectado`);
    }

    /**
     * Área da borda: cria o cenário do gateway na primeira vez, senão
     * atualiza só a área dele (os obstáculos ficam). Área desconhecida (borda
     * sem calibração/ARENA_*) não mexe no cenário.
     */
    async saveArena(identity: EdgeGatewayIdentity, view: EdgeArenaView): Promise<ScenarioModel | null> {
        const fields = GatewayService.fieldsOf(view);
        if (!fields) {
            console.warn(`[GATEWAY] ${GatewayService.label(identity)} sem área conhecida - o cenário fica como está`);
            return null;
        }

        const gateway = await this.findOrCreate(identity);
        const scenario = await this.scenarios.applyEdgeArea(gateway.uuid, `Mapa ${GatewayService.label(identity)}`, fields);
        if (!scenario) return null;

        console.log(
            `[GATEWAY] ${GatewayService.label(identity)} área: ${fields.sizeX} × ${fields.sizeY} mm ` +
            `em (${fields.areaX}, ${fields.areaY}) (${fields.areaLayout})`
        );
        this.events.emit(EventsCommands.scenarioUpdated, { scenario });
        return scenario;
    }

    /** Cenário (mapa) do gateway; 404 sem gateway ou se a borda ainda não mandou área. */
    async getScenario(gatewayId: string): Promise<ScenarioModel> {
        await this.ensureExists(gatewayId);
        return await this.scenarios.getByGateway(gatewayId);
    }

    private async findOrCreate(identity: EdgeGatewayIdentity): Promise<GatewayModel> {
        const existing = await this.gatewayRepository.getByIdentity(identity);
        if (existing) return existing;
        return await this.gatewayRepository.insert({ ...identity, name: GatewayService.label(identity), connected: false });
    }

    private enqueue(task: () => Promise<unknown>): void {
        this.queue = this.queue.then(task).catch((error) =>
            console.error("[GATEWAY] erro ao tratar evento da borda:", error.message ?? error),
        );
    }

    // "lab-borda · mari · 1200"
    private static label({ edgeId, mode, networkId }: EdgeGatewayIdentity): string {
        return `${edgeId} · ${mode} · ${networkId}`;
    }

    // Área da borda → campos do cenário (mm inteiros). null = área desconhecida.
    private static fieldsOf(view: EdgeArenaView): ScenarioAreaFields | null {
        const area = view?.area;
        if (!view?.source || !view.layout || !area || !(area.width > 0) || !(area.height > 0)) return null;

        const calibration = view.calibration;
        return {
            sizeX: round(area.width)!,
            sizeY: round(area.height)!,
            areaSource: view.source,
            areaLayout: view.layout,
            areaX: round(area.x),
            areaY: round(area.y),
            calibrationX: round(calibration?.x),
            calibrationY: round(calibration?.y),
            calibrationWidth: round(calibration?.width),
            calibrationHeight: round(calibration?.height),
            calibrationChannels: Array.isArray(view.channels) ? view.channels : null,
            calibrationVersion: view.version ?? null,
            calibrationFile: view.file ?? null,
        };
    }
}

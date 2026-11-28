import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { GATEWAY_ADAPTER } from "src/adapter/GatewayAdapter.interface";
import type { GatewayAdapter } from "src/adapter/GatewayAdapter.interface";
import { MariGatewayAdapter } from "src/adapter/Mari/MariGateway.Adapter";
import { arenaConfig } from "src/config/arena.config";
import { gatewayIdentity, GatewayIdentity } from "src/config/gateway.config";
import { LH2_ARENA_FACTOR } from "src/Constants/Lh2.Constants";
import { EdgeSocketEvents } from "src/Enums/EdgeSocketEvents.enum";
import { Lh2Calibration } from "src/Protocols/Swarmit/Lh2Calibration";
import { EdgeWebsockets } from "src/Websockets/Edge.Websockets";
import { UplinkService } from "../Uplink/Uplink.Service";
import { ArenaView } from "./Arena.Types";

/**
 * A área do gateway, derivada de quem define as coordenadas: no modo mari, a
 * calibração LH2 carregada; nos outros, ARENA_* do .env. Publica no
 * arena:snapshot a cada (re)conexão do uplink e quando a calibração muda.
 */
@Injectable()
export class ArenaService implements OnModuleInit {

    constructor(
        @Inject(GATEWAY_ADAPTER) private readonly gateway: GatewayAdapter,
        private readonly uplink: UplinkService,
        private readonly ws: EdgeWebsockets,
    ) {}

    onModuleInit(): void {
        this.uplink.onConnect(() => this.uplink.emit(EdgeSocketEvents.ArenaSnapshot, this.view()));

        if (this.gateway instanceof MariGatewayAdapter)
            this.gateway.onLh2CalibrationChange(() => this.ws.emitArena(this.view()));
    }

    identity(): GatewayIdentity {
        return gatewayIdentity();
    }

    view(): ArenaView {
        const gateway = this.identity();

        if (this.gateway instanceof MariGatewayAdapter)
            return ArenaService.fromCalibration(gateway, this.gateway.lh2Calibration());

        const { widthMm, heightMm } = arenaConfig;
        if (widthMm === null || heightMm === null)
            return ArenaService.unknown(gateway);

        return {
            ...ArenaService.unknown(gateway),
            source: "config",
            layout: "config",
            area: { x: 0, y: 0, width: widthMm, height: heightMm },
        };
    }

    private static fromCalibration(gateway: GatewayIdentity, calibration: Lh2Calibration | null): ArenaView {
        const layout = calibration?.layout;
        if (!calibration || !layout) return ArenaService.unknown(gateway);

        // Sem área informada, vale a arena do PyDotBot: 5 × o retângulo, a partir de (0, 0).
        const area = layout.area ?? {
            x: 0, y: 0, width: layout.widthMm * LH2_ARENA_FACTOR, height: layout.heightMm * LH2_ARENA_FACTOR,
        };

        return {
            gateway,
            source: "lh2",
            layout: layout.area ? "area" : "pydotbot",
            area,
            calibration: { x: layout.rectX, y: layout.rectY, width: layout.widthMm, height: layout.heightMm },
            channels: calibration.stations.map((index) => index + 1),
            version: calibration.meta?.createdAt?.toISOString() ?? null,
            file: calibration.source,
        };
    }

    private static unknown(gateway: GatewayIdentity): ArenaView {
        return { gateway, source: null, layout: null, area: null, calibration: null, channels: null, version: null, file: null };
    }
}

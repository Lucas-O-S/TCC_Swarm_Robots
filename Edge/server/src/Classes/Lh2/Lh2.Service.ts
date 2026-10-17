import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { GATEWAY_ADAPTER } from "src/adapter/GatewayAdapter.interface";
import type { GatewayAdapter } from "src/adapter/GatewayAdapter.interface";
import { MariGatewayAdapter } from "src/adapter/Mari/MariGateway.Adapter";
import { SwarmitNode } from "src/adapter/Mari/SwarmitFleet";
import { SwarmitDeviceStatus } from "src/Enums/SwarmitDeviceStatus.enum";
import { Protocol } from "src/Protocols/Protocol";
import { Lh2CalibrationView, Lh2PushResult, Lh2RobotView } from "./Lh2.Types";

/**
 * Calibração LH2 vista de fora: o que está carregado, como cada robô está e o
 * reenvio forçado. Só existe com o transporte Mari - é o único que fala
 * SwarmIT, e a calibração vai por ele (SWARMIT_LH2_CALIBRATION).
 */
@Injectable()
export class Lh2Service {

    constructor(@Inject(GATEWAY_ADAPTER) private readonly gateway: GatewayAdapter) {}

    getCalibration(): Lh2CalibrationView {
        const mari = this.mari();

        if (!mari) {
            return { supported: false, file: null, stationCount: null, robots: [] };
        }

        const calibration = mari.lh2Calibration();
        const stationCount = calibration?.count ?? null;

        return {
            supported: true,
            file: calibration?.source ?? null,
            stationCount,
            robots: mari.swarmitFleet().map((node) => this.robotView(node, stationCount)),
        };
    }

    // Sem address = frota toda. Quem decide quando enviar é o SwarmitFleet,
    // no próximo tick, e só para robô em Bootloader.
    push(address?: string): Lh2PushResult {
        const mari = this.mari();

        if (!mari) {
            throw new ConflictException("Calibração LH2 só existe no modo mari (GATEWAY_MODE=mari)");
        }

        if (!mari.lh2Calibration()) {
            throw new ConflictException("Nenhuma calibração carregada (LH2_CALIBRATION_FILE vazio)");
        }

        const marked = mari.forceLh2Calibration(address);

        if (address !== undefined && marked.length === 0) {
            throw new NotFoundException(`A malha SwarmIT nunca reportou o robô '${Protocol.normalizeAddress(address)}'`);
        }

        const notInBootloader = mari.swarmitFleet()
            .filter((node) => marked.includes(node.address))
            .filter((node) => node.status.status !== SwarmitDeviceStatus.Bootloader)
            .map((node) => node.address);

        return { marked, notInBootloader };
    }

    private mari(): MariGatewayAdapter | null {
        return this.gateway instanceof MariGatewayAdapter ? this.gateway : null;
    }

    private robotView(node: SwarmitNode, stationCount: number | null): Lh2RobotView {
        const matchesFile = stationCount === null || node.lh2 === null
            ? null
            : node.lh2.valid && node.lh2.deviceCount === stationCount;

        return {
            address: node.address,
            status: SwarmitDeviceStatus[node.status.status] ?? String(node.status.status),
            lh2: node.lh2,
            matchesFile,
            calibrateAttempts: node.calibrateAttempts,
            forcePending: node.forceCalibration,
        };
    }
}

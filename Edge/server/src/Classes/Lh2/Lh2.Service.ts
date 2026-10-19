import { BadRequestException, ConflictException, GatewayTimeoutException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { GATEWAY_ADAPTER } from "src/adapter/GatewayAdapter.interface";
import type { GatewayAdapter } from "src/adapter/GatewayAdapter.interface";
import { MariGatewayAdapter } from "src/adapter/Mari/MariGateway.Adapter";
import { SwarmitNode } from "src/adapter/Mari/SwarmitFleet";
import { SwarmitDeviceStatus } from "src/Enums/SwarmitDeviceStatus.enum";
import { Protocol } from "src/Protocols/Protocol";
import { Lh2CalibrationView, Lh2CornerResult, Lh2PushResult, Lh2RobotView, Lh2SolveResult } from "./Lh2.Types";
import { Lh2CaptureBusyError, Lh2CaptureTimeoutError, Lh2CaptureView } from "src/adapter/Mari/Lh2CaptureSession";
import { Lh2Corner } from "src/Enums/Lh2Corner.enum";
import { LH2_CALIBRATION_DISTANCE_DEFAULT } from "src/Constants/Lh2.Constants";
import { Lh2CaptureStartDto } from "./DTO/lh2.capture.start.dto";

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
        const mari = this.requireMari();

        if (!mari.lh2Calibration()) {
            throw new ConflictException("Nenhuma calibração carregada (LH2_CALIBRATION_FILE vazio)");
        }

        const marked = mari.forceLh2Calibration(address);

        if (address !== undefined && marked.length === 0) {
            throw new NotFoundException(`A malha SwarmIT nunca reportou o robô '${Protocol.normalizeAddress(address)}'`);
        }

        return { marked, notInBootloader: this.notInBootloader(mari, marked) };
    }

    // --- captura LH2 pela própria borda --------------------------------------

    startCapture(dto: Lh2CaptureStartDto): Lh2CaptureView {
        const mari = this.requireMari();

        if (mari.lh2CaptureSession())
            throw new ConflictException(`Já existe captura em andamento para ${mari.lh2CaptureSession()!.address} - resolva ou cancele antes`);

        if (!mari.swarmitFleet().some((node) => node.address === Protocol.normalizeAddress(dto.address)))
            throw new NotFoundException(`A malha SwarmIT nunca reportou o robô '${Protocol.normalizeAddress(dto.address)}'`);

        return mari.beginLh2Capture(dto.address, dto.distanceMm ?? LH2_CALIBRATION_DISTANCE_DEFAULT, dto.tag ?? null).view();
    }

    getCapture(): Lh2CaptureView {
        return this.requireSession().view();
    }

    async captureCorner(corner: Lh2Corner): Promise<Lh2CornerResult> {
        const mari = this.requireMari();
        const session = this.requireSession();

        try {
            const sample = await mari.captureLh2Corner(corner);
            return { corner, sample, session: session.view() };
        } catch (error) {
            if (error instanceof Lh2CaptureTimeoutError) throw new GatewayTimeoutException(error.message);
            if (error instanceof Lh2CaptureBusyError) throw new ConflictException(error.message);
            // Fora do Bootloader ou captura cancelada no meio.
            throw new ConflictException((error as Error).message);
        }
    }

    solveCapture(): Lh2SolveResult {
        const mari = this.requireMari();
        const session = this.requireSession();

        if (!session.isComplete())
            throw new BadRequestException(`Faltam os cantos: ${session.view().missing.join(", ")}`);

        try {
            const { calibration, marked } = mari.solveLh2Capture();
            return {
                file: calibration.source,
                stationCount: calibration.count,
                marked,
                notInBootloader: this.notInBootloader(mari, marked),
            };
        } catch (error) {
            // Capturas inconsistentes (canto repetido, fora de ordem): refazer.
            throw new BadRequestException((error as Error).message);
        }
    }

    cancelCapture(): { cancelled: boolean } {
        return { cancelled: this.requireMari().cancelLh2Capture() };
    }

    private requireMari(): MariGatewayAdapter {
        const mari = this.mari();
        if (!mari) throw new ConflictException("Calibração LH2 só existe no modo mari (GATEWAY_MODE=mari)");
        return mari;
    }

    private requireSession() {
        const session = this.requireMari().lh2CaptureSession();
        if (!session) throw new NotFoundException("Nenhuma captura em andamento - comece com POST /v1/lh2/calibration/session");
        return session;
    }

    // Marcados mas fora do Bootloader: só recebem quando pararem (o net core
    // ignora a calibração em Running).
    private notInBootloader(mari: MariGatewayAdapter, marked: string[]): string[] {
        return mari.swarmitFleet()
            .filter((node) => marked.includes(node.address))
            .filter((node) => node.status.status !== SwarmitDeviceStatus.Bootloader)
            .map((node) => node.address);
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

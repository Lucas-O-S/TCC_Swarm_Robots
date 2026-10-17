import { ConflictException, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { Lh2Service } from "../Classes/Lh2/Lh2.Service";
import { Lh2PushDto } from "../Classes/Lh2/DTO/lh2.push.dto";
import { WaypointsDto } from "../Classes/Commands/DTO/waypoints.dto";
import { MariGatewayAdapter } from "../adapter/Mari/MariGateway.Adapter";
import { SwarmitFleet } from "../adapter/Mari/SwarmitFleet";
import { Lh2Calibration } from "../Protocols/Swarmit/Lh2Calibration";
import { SwarmitDeviceInfo, SwarmitStatus } from "../Protocols/Swarmit/Swarmit.Protocol";
import { Lh2Flags, SwarmitDeviceStatus, SwarmitDeviceType } from "../Enums/SwarmitDeviceStatus.enum";
import { LH2_MAX_WAYPOINTS } from "../Constants/Lh2.Constants";

const A = "BDF2B04BC00D2725";
const B = "0000000000000002";

const status = (state: SwarmitDeviceStatus): SwarmitStatus => ({
    device: SwarmitDeviceType.DotBotV3, status: state, batteryMv: 3000,
    posX: 0, posY: 0, resetReason: 0, fault: 0, fromNs: 0,
    cfsr: 0, sfsr: 0, pc: 0, lr: 0, sp: 0, psr: 0, infoGen: 1,
});

const info = (lh2Count: number, lh2Flags: number): SwarmitDeviceInfo => ({
    infoVersion: 1, infoGen: 1, bootCount: 1, uptimeS: 10, blVersion: "", netVersion: "",
    imageState: 0, imageResult: 0, imageSize: 1024, imageDigest: "0000000000000000",
    imageName: "dotbot", imageVersion: "1.23.0", lh2HomographyCount: lh2Count, lh2Flags,
});

const matrix = Buffer.alloc(36, 1);

// Mari sem serial: A em Bootloader sem calibração, B em Running calibrado.
const mariService = (withFile = true) => {
    const adapter = new MariGatewayAdapter();
    const internals = adapter as any;
    const fleet: SwarmitFleet = internals.fleet;

    if (withFile) {
        internals.calibration = Lh2Calibration.fromPayload(Buffer.concat([Buffer.from([1]), matrix]), "/tmp/calibration.out");
        fleet.configure({ lh2StationCount: 1 });
    }

    fleet.onStatus(A, status(SwarmitDeviceStatus.Bootloader));
    fleet.onDeviceInfo(A, info(0, 0));
    fleet.onStatus(B, status(SwarmitDeviceStatus.Running));
    fleet.onDeviceInfo(B, info(1, Lh2Flags.valid | Lh2Flags.fromFlash));

    return new Lh2Service(adapter);
};

const simulatorService = () => new Lh2Service({ send: () => {}, onFrameReceived: () => {} });

describe("GET /v1/lh2/calibration", () => {

    it("fora do modo mari: não se aplica", () => {
        expect(simulatorService().getCalibration()).toEqual({ supported: false, file: null, stationCount: null, robots: [] });
    });

    it("mostra o arquivo e cada robô comparado com ele", () => {
        const view = mariService().getCalibration();

        expect(view).toMatchObject({ supported: true, file: "/tmp/calibration.out", stationCount: 1 });
        expect(view.robots).toEqual([
            { address: B, status: "Running", lh2: { valid: true, deviceCount: 1 }, matchesFile: true, calibrateAttempts: 0, forcePending: false },
            { address: A, status: "Bootloader", lh2: { valid: false, deviceCount: 0 }, matchesFile: false, calibrateAttempts: 0, forcePending: false },
        ]);
    });

    it("sem arquivo, matchesFile fica null", () => {
        const view = mariService(false).getCalibration();
        expect(view.stationCount).toBeNull();
        expect(view.robots.every((r) => r.matchesFile === null)).toBe(true);
    });
});

describe("POST /v1/lh2/calibration/push", () => {

    it("fora do modo mari é 409", () => {
        expect(() => simulatorService().push()).toThrow(ConflictException);
    });

    it("sem arquivo carregado é 409", () => {
        expect(() => mariService(false).push(A)).toThrow(ConflictException);
    });

    it("robô que a malha não conhece é 404", () => {
        expect(() => mariService().push("00000000000000FF")).toThrow(NotFoundException);
    });

    it("marca a frota toda e avisa quem não está em Bootloader", () => {
        expect(mariService().push()).toEqual({ marked: expect.arrayContaining([A, B]), notInBootloader: [B] });
    });

    it("aceita endereço em minúsculas", () => {
        expect(mariService().push(A.toLowerCase())).toEqual({ marked: [A], notInBootloader: [] });
    });

    it("DTO recusa endereço que não é 16 hex", () => {
        expect(validateSync(plainToInstance(Lh2PushDto, { address: "xyz" }))).toHaveLength(1);
        expect(validateSync(plainToInstance(Lh2PushDto, {}))).toHaveLength(0);
    });
});

describe("waypoints - limite do firmware", () => {

    const body = (count: number) => plainToInstance(WaypointsDto, {
        threshold: 100,
        waypoints: Array.from({ length: count }, (_, i) => ({ x: i * 100, y: 0 })),
    });

    it(`aceita até ${LH2_MAX_WAYPOINTS} pontos`, () => {
        expect(validateSync(body(LH2_MAX_WAYPOINTS))).toHaveLength(0);
    });

    it(`recusa ${LH2_MAX_WAYPOINTS + 1} pontos`, () => {
        const errors = validateSync(body(LH2_MAX_WAYPOINTS + 1));
        expect(errors).toHaveLength(1);
        expect(Object.values(errors[0].constraints ?? {})[0]).toContain(`no máximo ${LH2_MAX_WAYPOINTS}`);
    });
});

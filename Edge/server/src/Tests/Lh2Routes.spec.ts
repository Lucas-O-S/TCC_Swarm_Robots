import { BadRequestException, ConflictException, GatewayTimeoutException, NotFoundException } from "@nestjs/common";
import { existsSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { lh2Config } from "../config/lh2.config";
import { Lh2Corner } from "../Enums/Lh2Corner.enum";
import { Lh2CaptureStartDto } from "../Classes/Lh2/DTO/lh2.capture.start.dto";
import { Lh2CaptureCornerDto } from "../Classes/Lh2/DTO/lh2.capture.corner.dto";
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
import { LH2_CAPTURE_MIN_RESPONSES, LH2_CAPTURE_RETRIES, LH2_MAX_WAYPOINTS } from "../Constants/Lh2.Constants";

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
const mariSetup = (withFile = true) => {
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

    // Sem serial: o que sairia pelo rádio fica registrado aqui.
    const sent = jest.spyOn(adapter, "sendSwarmit").mockImplementation(() => {});

    return { adapter, fleet, sent, service: new Lh2Service(adapter) };
};

const mariService = (withFile = true) => mariSetup(withFile).service;

const simulatorService = () => new Lh2Service({ send: () => {}, onFrameReceived: () => {} });

describe("GET /v1/lh2/calibration", () => {

    it("fora do modo mari: não se aplica", () => {
        expect(simulatorService().getCalibration()).toEqual({ supported: false, file: null, stationCount: null, channels: null, robots: [] });
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

describe("/v1/lh2/calibration/session - captura pela borda", () => {

    // Contagens do caso de 500 mm do Lh2Homography.spec (vetor do PyDotBot).
    const COUNTS: Record<Lh2Corner, [number, number]> = {
        [Lh2Corner.TopLeft]: [31000, 69000],
        [Lh2Corner.TopRight]: [52000, 88000],
        [Lh2Corner.BottomLeft]: [28000, 61000],
        [Lh2Corner.BottomRight]: [47000, 79000],
    };

    // O EVENT_LOG que o robô manda em resposta ao 0xA2: uma leitura por base.
    const reply = (adapter: MariGatewayAdapter, [c1, c2]: [number, number], lhIndexes = [0]) => {
        const data = Buffer.alloc(1 + 9 * lhIndexes.length);
        data.writeUInt8(0xCA, 0);
        lhIndexes.forEach((lhIndex, i) => {
            data.writeUInt8(lhIndex, 1 + i * 9);
            data.writeUInt32LE(c1, 2 + i * 9);
            data.writeUInt32LE(c2, 6 + i * 9);
        });
        const head = Buffer.from([0x89, 0, 0, 0, 0, data.length]);
        (adapter as any).onSwarmitPacket({ header: { source: A }, payload: Buffer.concat([head, data]) });
    };

    // Responde até o canto fechar (o que sobra cai sem canto pendente e é ignorado).
    const answer = (adapter: MariGatewayAdapter, counts: [number, number], lhIndexes = [0]) => {
        for (let i = 0; i < LH2_CAPTURE_MIN_RESPONSES + LH2_CAPTURE_RETRIES; i++) reply(adapter, counts, lhIndexes);
    };

    let dir: string;
    const originalDir = lh2Config.calibrationDir;
    const originalFile = lh2Config.calibrationFile;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "lh2-capture-"));
        lh2Config.calibrationDir = dir;
        lh2Config.calibrationFile = null;
    });

    afterEach(() => {
        lh2Config.calibrationDir = originalDir;
        lh2Config.calibrationFile = originalFile;
        rmSync(dir, { recursive: true, force: true });
        jest.useRealTimers();
    });

    it("fluxo completo: reserva, 4 cantos, resolve, grava e manda para a frota", async () => {
        const { adapter, fleet, sent, service } = mariSetup(false);

        expect(service.startCapture({ address: A.toLowerCase(), tag: "arena taak" })).toMatchObject({ address: A, distanceMm: 500 });
        expect(fleet.get(A)?.held).toBe(true);

        for (const corner of Object.values(Lh2Corner)) {
            const pending = service.captureCorner(corner);
            answer(adapter, COUNTS[corner]);
            await expect(pending).resolves.toMatchObject({ corner, samples: [{ lhIndex: 0, count1: COUNTS[corner][0] }] });
        }

        // Cada canto saiu como LH2_CAPTURE_MIN_RESPONSES 0xA2 endereçados ao robô.
        expect(sent.mock.calls.filter(([, p]) => p[0] === 0xA2).map(([to]) => to))
            .toEqual(Array(4 * LH2_CAPTURE_MIN_RESPONSES).fill(A));

        const result = service.solveCapture();

        expect(result).toMatchObject({ stationCount: 1, channels: [1], keptOnRestart: true, notInBootloader: [B] });
        expect(result.marked).toEqual(expect.arrayContaining([A, B]));
        expect(result.file.startsWith(dir)).toBe(true);
        expect(result.file).toMatch(/calibration-arena-taak-.*\.toml$/);
        expect(existsSync(result.file)).toBe(true);

        // O arquivo gravado é o que a borda carrega no boot e o que o CLI lê.
        const saved = Lh2Calibration.fromFile(result.file);
        expect(saved.payload.equals(adapter.lh2Calibration()!.payload)).toBe(true);
        expect(service.getCalibration().file).toBe(result.file);

        // Sessão encerrada e robô solto.
        expect(fleet.get(A)?.held).toBe(false);
        expect(() => service.getCapture()).toThrow(NotFoundException);
    });

    it("base em outro canal: calibra o que o robô enxerga, no slot do índice dele", async () => {
        const { adapter, service } = mariSetup(false);
        service.startCapture({ address: A });

        for (const corner of Object.values(Lh2Corner)) {
            const pending = service.captureCorner(corner);
            answer(adapter, COUNTS[corner], [6]);
            await expect(pending).resolves.toMatchObject({ samples: [{ lhIndex: 6 }] });
        }
        expect(service.getCapture()).toMatchObject({ bases: [{ channel: 7, missing: [] }] });

        const result = service.solveCapture();
        expect(result).toMatchObject({ stationCount: 7, channels: [7] });

        // Slots 0..5 zerados: o firmware usa homography_matrix[lh_index].
        const saved = Lh2Calibration.fromFile(result.file);
        expect(saved.matrices.slice(0, 6).every((m) => m.every((b) => b === 0))).toBe(true);
        expect(saved.stations).toEqual([6]);
        expect(service.getCalibration()).toMatchObject({ stationCount: 7, channels: [7] });
    });

    it("duas bases: uma passada calibra as duas num arquivo só", async () => {
        const { adapter, service } = mariSetup(false);
        service.startCapture({ address: A });

        for (const corner of Object.values(Lh2Corner)) {
            const pending = service.captureCorner(corner);
            answer(adapter, COUNTS[corner], [0, 2]);
            await expect(pending).resolves.toMatchObject({ samples: [{ lhIndex: 0 }, { lhIndex: 2 }] });
        }
        expect(service.getCapture().bases).toEqual([{ channel: 1, missing: [] }, { channel: 3, missing: [] }]);

        const result = service.solveCapture();
        expect(result).toMatchObject({ stationCount: 3, channels: [1, 3] });

        // Uma matriz por base, no slot do índice; o do canal 2 zerado.
        const saved = Lh2Calibration.fromFile(result.file);
        expect(saved.stations).toEqual([0, 2]);
        expect(saved.matrices[1].every((b) => b === 0)).toBe(true);
        expect(saved.matrices[0].equals(saved.matrices[2])).toBe(false);
        expect(service.getCalibration()).toMatchObject({ stationCount: 3, channels: [1, 3] });
    });

    it("base que não apareceu nos 4 cantos: solve é 400 e a sessão continua", async () => {
        const { adapter, service } = mariSetup(false);
        service.startCapture({ address: A });

        for (const corner of Object.values(Lh2Corner)) {
            const pending = service.captureCorner(corner);
            answer(adapter, COUNTS[corner], corner === Lh2Corner.TopLeft ? [0, 1] : [0]);
            await pending;
        }

        expect(service.getCapture().bases).toEqual([
            { channel: 1, missing: [] },
            { channel: 2, missing: [Lh2Corner.TopRight, Lh2Corner.BottomLeft, Lh2Corner.BottomRight] },
        ]);
        expect(() => service.solveCapture()).toThrow(/base do canal 2 não apareceu em top-right, bottom-left, bottom-right/);
        expect(service.getCapture().address).toBe(A);
    });

    it("captura sem resposta vira 504", async () => {
        jest.useFakeTimers();
        const { service } = mariSetup(false);
        service.startCapture({ address: A });

        const outcome = expect(service.captureCorner(Lh2Corner.TopLeft)).rejects.toThrow(GatewayTimeoutException);
        await jest.advanceTimersByTimeAsync(20000);
        await outcome;
    });

    it("robô fora do Bootloader é 409", async () => {
        const { service } = mariSetup(false);
        service.startCapture({ address: B });
        await expect(service.captureCorner(Lh2Corner.TopLeft)).rejects.toThrow(ConflictException);
    });

    it("solve sem os 4 cantos é 400; segunda sessão é 409; robô desconhecido é 404", () => {
        const { service } = mariSetup(false);
        expect(() => service.startCapture({ address: "00000000000000FF" })).toThrow(NotFoundException);

        service.startCapture({ address: A });
        expect(() => service.startCapture({ address: B })).toThrow(ConflictException);
        expect(() => service.solveCapture()).toThrow(BadRequestException);
    });

    it("cancelar solta o robô", () => {
        const { fleet, service } = mariSetup(false);
        service.startCapture({ address: A });
        expect(service.cancelCapture()).toEqual({ cancelled: true });
        expect(fleet.get(A)?.held).toBe(false);
        expect(service.cancelCapture()).toEqual({ cancelled: false });
    });

    it("fora do modo mari é 409", () => {
        expect(() => simulatorService().startCapture({ address: A })).toThrow(ConflictException);
    });

    it("DTOs: endereço, lado do quadrado e canto", () => {
        expect(validateSync(plainToInstance(Lh2CaptureStartDto, { address: A, distanceMm: 500 }))).toHaveLength(0);
        expect(validateSync(plainToInstance(Lh2CaptureStartDto, { address: A, distanceMm: 50 }))).toHaveLength(1);
        expect(validateSync(plainToInstance(Lh2CaptureStartDto, {}))).toHaveLength(1);
        expect(validateSync(plainToInstance(Lh2CaptureCornerDto, { corner: "top-left" }))).toHaveLength(0);
        expect(validateSync(plainToInstance(Lh2CaptureCornerDto, { corner: "meio" }))).toHaveLength(1);
    });
});

describe("boot - calibração sem LH2_CALIBRATION_FILE", () => {

    const load = (): Lh2Calibration | null => (MariGatewayAdapter as any).loadCalibration();

    const write = (dir: string, name: string, payload: Buffer, mtimeS: number) => {
        const path = join(dir, name);
        writeFileSync(path, Lh2Calibration.fromPayload(payload, name).toToml({ distanceMm: 500 }));
        utimesSync(path, mtimeS, mtimeS);
        return path;
    };

    let dir: string;
    const originalDir = lh2Config.calibrationDir;
    const originalFile = lh2Config.calibrationFile;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "lh2-boot-"));
        lh2Config.calibrationDir = dir;
        lh2Config.calibrationFile = null;
    });

    afterEach(() => {
        lh2Config.calibrationDir = originalDir;
        lh2Config.calibrationFile = originalFile;
        rmSync(dir, { recursive: true, force: true });
        jest.restoreAllMocks();
    });

    it("pasta vazia ou inexistente: sobe sem calibração", () => {
        expect(load()).toBeNull();
        lh2Config.calibrationDir = join(dir, "nao-existe");
        expect(load()).toBeNull();
    });

    it("carrega o TOML mais recente da pasta (o último solve)", () => {
        write(dir, "calibration-2026-10-01T00-00-00Z.toml", Buffer.concat([Buffer.from([1]), matrix]), 1000);
        const latest = write(dir, "calibration-arena-2026-09-01T00-00-00Z.toml", Buffer.concat([Buffer.from([2]), matrix, matrix]), 2000);

        expect(load()).toMatchObject({ source: latest, count: 2 });
    });

    it("o mais recente inválido vira aviso, não derruba o boot", () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        write(dir, "calibration-ok.toml", Buffer.concat([Buffer.from([1]), matrix]), 1000);
        writeFileSync(join(dir, "calibration-novo.toml"), "schema_version = 3\n");

        expect(load()).toBeNull();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("calibration-novo.toml ignorado"));
    });

    it("LH2_CALIBRATION_FILE manda, mesmo mais antigo", () => {
        const fixed = write(dir, "calibration-fixo.toml", Buffer.concat([Buffer.from([1]), matrix]), 1000);
        write(dir, "calibration-novo.toml", Buffer.concat([Buffer.from([2]), matrix, matrix]), 2000);
        lh2Config.calibrationFile = fixed;

        expect(load()).toMatchObject({ source: fixed, count: 1 });
    });
});

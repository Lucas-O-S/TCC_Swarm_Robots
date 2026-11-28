import { BadRequestException, ConflictException, GatewayTimeoutException, NotFoundException } from "@nestjs/common";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { basename, join } from "path";
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
import { LH2_MAX_WAYPOINTS } from "../Constants/Lh2.Constants";
import { Lh2Homography } from "../Protocols/Swarmit/Lh2Homography";
import { Lh2CorrectDto } from "../Classes/Lh2/DTO/lh2.correct.dto";

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
        expect(simulatorService().getCalibration()).toEqual({ supported: false, file: null, stationCount: null, channels: null, metadata: null, robots: [] });
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

    // O EVENT_LOG que o robô manda em resposta ao 0xA2.
    const reply = (adapter: MariGatewayAdapter, [c1, c2]: [number, number], lhIndex = 0) => {
        const data = Buffer.alloc(10);
        data.writeUInt8(0xCA, 0);
        data.writeUInt8(lhIndex, 1);
        data.writeUInt32LE(c1, 2);
        data.writeUInt32LE(c2, 6);
        const head = Buffer.from([0x89, 0, 0, 0, 0, data.length]);
        (adapter as any).onSwarmitPacket({ header: { source: A }, payload: Buffer.concat([head, data]) });
    };

    let dir: string;
    const originalDir = lh2Config.calibrationDir;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "lh2-capture-"));
        lh2Config.calibrationDir = dir;
    });

    afterEach(() => {
        lh2Config.calibrationDir = originalDir;
        rmSync(dir, { recursive: true, force: true });
        jest.useRealTimers();
    });

    it("fluxo completo: reserva, 4 cantos, resolve, grava e manda para a frota", async () => {
        const { adapter, fleet, sent, service } = mariSetup(false);

        expect(service.startCapture({ address: A.toLowerCase(), tag: "arena taak" })).toMatchObject({ address: A, widthMm: 500, heightMm: 500 });
        expect(fleet.get(A)?.held).toBe(true);

        for (const corner of Object.values(Lh2Corner)) {
            const pending = service.captureCorner(corner);
            reply(adapter, COUNTS[corner]);
            await expect(pending).resolves.toMatchObject({ corner, sample: { lhIndex: 0, count1: COUNTS[corner][0] } });
        }

        // Cada canto saiu como um 0xA2 endereçado ao robô.
        expect(sent.mock.calls.filter(([, p]) => p[0] === 0xA2).map(([to]) => to)).toEqual([A, A, A, A]);

        const result = service.solveCapture();

        expect(result).toMatchObject({ stationCount: 1, channels: [1], notInBootloader: [B] });
        expect(result.marked).toEqual(expect.arrayContaining([A, B]));
        expect(result.file.startsWith(dir)).toBe(true);
        expect(result.file).toMatch(/calibration-arena-taak-.*\.toml$/);
        expect(existsSync(result.file)).toBe(true);

        // O arquivo gravado é o que a borda carrega no boot e o que o CLI lê.
        const saved = Lh2Calibration.fromFile(result.file);
        expect(saved.payload.equals(adapter.lh2Calibration()!.payload)).toBe(true);
        expect(service.getCalibration().file).toBe(result.file);

        // Lado, tag e data do [metadata], no solve e no GET.
        // Sem área informada: layout do PyDotBot (canto TL do quadrado em 2 × o lado).
        const metadata = { distanceMm: 500, widthMm: 500, heightMm: 500, tag: "arena-taak", createdAt: expect.any(String), rectX: 1000, rectY: 1000, area: null, correctedFrom: null };
        expect(result.metadata).toEqual(metadata);
        expect(service.getCalibration().metadata).toEqual(metadata);

        // Leituras cruas dos cantos ao lado do TOML.
        expect(result.cornersFile).toBe(result.file.replace(/\.toml$/, ".corners.json"));
        const record = JSON.parse(readFileSync(result.cornersFile, "utf8"));
        expect(record).toMatchObject({
            schemaVersion: 1, calibrationFile: basename(result.file), address: A,
            widthMm: 500, heightMm: 500, rectX: 1000, rectY: 1000, area: null, tag: "arena-taak", station: 0, channel: 1, createdAt: result.metadata!.createdAt,
        });
        for (const corner of Object.values(Lh2Corner))
            expect(record.corners[corner]).toEqual({ lhIndex: 0, count1: COUNTS[corner][0], count2: COUNTS[corner][1] });

        // Robô que aparecer depois do solve também recebe a calibração nova.
        const C = "0000000000000003";
        fleet.onStatus(C, status(SwarmitDeviceStatus.Bootloader));
        expect(fleet.get(C)?.forceCalibration).toBe(true);

        // Sessão encerrada e robô solto.
        expect(fleet.get(A)?.held).toBe(false);
        expect(() => service.getCapture()).toThrow(NotFoundException);
    });

    it("base em outro canal: calibra o que o robô enxerga, no slot do índice dele", async () => {
        const { adapter, service } = mariSetup(false);
        service.startCapture({ address: A });

        for (const corner of Object.values(Lh2Corner)) {
            const pending = service.captureCorner(corner);
            reply(adapter, COUNTS[corner], 6);
            await expect(pending).resolves.toMatchObject({ sample: { lhIndex: 6 } });
        }
        expect(service.getCapture()).toMatchObject({ station: 6, channel: 7 });

        const result = service.solveCapture();
        expect(result).toMatchObject({ stationCount: 7, channels: [7] });

        // Slots 0..5 zerados: o firmware usa homography_matrix[lh_index].
        const saved = Lh2Calibration.fromFile(result.file);
        expect(saved.matrices.slice(0, 6).every((m) => m.every((b) => b === 0))).toBe(true);
        expect(saved.stations).toEqual([6]);
        expect(service.getCalibration()).toMatchObject({ stationCount: 7, channels: [7] });
    });

    it("channel no início fixa a estação: leitura de outro canal não fecha o canto", async () => {
        const { adapter, service } = mariSetup(false);
        expect(service.startCapture({ address: A, channel: 13 })).toMatchObject({ station: 12, channel: 13 });

        const pending = service.captureCorner(Lh2Corner.TopLeft);
        reply(adapter, COUNTS[Lh2Corner.TopLeft], 6);
        expect(service.getCapture()).toMatchObject({ pending: Lh2Corner.TopLeft, otherStations: [6] });

        reply(adapter, COUNTS[Lh2Corner.TopLeft], 12);
        await expect(pending).resolves.toMatchObject({ sample: { lhIndex: 12 } });
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

    // Área de 1,2 m com o quadrado de 800 colado a 200 mm das bordas de cima e da esquerda.
    const AREA = { areaWidthMm: 1200, areaHeightMm: 1200, rectXMm: 200, rectYMm: 200 };

    it("DTOs: campos da área", () => {
        expect(validateSync(plainToInstance(Lh2CaptureStartDto, { address: A, distanceMm: 800, ...AREA }))).toHaveLength(0);
        expect(validateSync(plainToInstance(Lh2CaptureStartDto, { address: A, ...AREA, rectXMm: -1 }))).toHaveLength(1);
        expect(validateSync(plainToInstance(Lh2CorrectDto, { ...AREA, areaWidthMm: 1.5 }))).toHaveLength(1);
        expect(validateSync(plainToInstance(Lh2CaptureStartDto, { address: A, widthMm: 1000, heightMm: 800 }))).toHaveLength(0);
        expect(validateSync(plainToInstance(Lh2CaptureStartDto, { address: A, widthMm: 1000, heightMm: 50 }))).toHaveLength(1);
    });

    it("sessão na área: referências em margem + posição do quadrado; campos soltos ou quadrado fora = 400", () => {
        const { service } = mariSetup(false);

        expect(() => service.startCapture({ address: A, distanceMm: 800, areaWidthMm: 1200 })).toThrow(/juntos/);
        expect(() => service.startCapture({ address: A, distanceMm: 800, ...AREA, rectXMm: 500 })).toThrow(BadRequestException);
        expect(() => service.startCapture({ address: A, widthMm: 1000 })).toThrow(/widthMm e heightMm/);
        expect(() => service.startCapture({ address: A, distanceMm: 800, widthMm: 1000, heightMm: 800 })).toThrow(/não os dois/);

        expect(service.startCapture({ address: A, distanceMm: 800, ...AREA })).toMatchObject({
            widthMm: 800,
            heightMm: 800,
            area: { x: 1000, y: 1000, width: 1200, height: 1200 },
            references: {
                [Lh2Corner.TopLeft]: [1200, 1200], [Lh2Corner.TopRight]: [2000, 1200],
                [Lh2Corner.BottomLeft]: [1200, 2000], [Lh2Corner.BottomRight]: [2000, 2000],
            },
        });
    });

    it("solve na área: grava o layout no TOML e no .corners.json, e os cantos caem nos pontos novos", async () => {
        const { adapter, service } = mariSetup(false);
        service.startCapture({ address: A, distanceMm: 800, ...AREA });

        for (const corner of Object.values(Lh2Corner)) {
            const pending = service.captureCorner(corner);
            reply(adapter, COUNTS[corner]);
            await pending;
        }
        const result = service.solveCapture();

        expect(result.metadata).toMatchObject({ distanceMm: 800, widthMm: 800, heightMm: 800, rectX: 1200, rectY: 1200, area: { x: 1000, y: 1000, width: 1200, height: 1200 } });
        const saved = Lh2Calibration.fromFile(result.file);
        expect(saved.meta).toMatchObject({ rectX: 1200, rectY: 1200, area: { x: 1000, y: 1000, width: 1200, height: 1200 } });
        expect(JSON.parse(readFileSync(result.cornersFile, "utf8"))).toMatchObject({ widthMm: 800, heightMm: 800, rectX: 1200, rectY: 1200, area: { x: 1000, y: 1000 } });

        // A matriz gravada (com o truncamento do fio) leva o canto TL para ~(1200, 1200).
        const h = Lh2Homography.fromWire(saved.matrices[0]);
        const [x, y] = Lh2Homography.apply(h, Lh2Homography.cameraPoint({ lhIndex: 0, count1: COUNTS[Lh2Corner.TopLeft][0], count2: COUNTS[Lh2Corner.TopLeft][1] }));
        expect(Math.abs(x - 1200)).toBeLessThan(1);
        expect(Math.abs(y - 1200)).toBeLessThan(1);
    });

    it("solve com retângulo: largura e altura no TOML e no GET", async () => {
        const { adapter, service } = mariSetup(false);
        service.startCapture({ address: A, widthMm: 1000, heightMm: 800, areaWidthMm: 1200, areaHeightMm: 1000, rectXMm: 100, rectYMm: 100 });

        for (const corner of Object.values(Lh2Corner)) {
            const pending = service.captureCorner(corner);
            reply(adapter, COUNTS[corner]);
            await pending;
        }
        const result = service.solveCapture();

        expect(result.metadata).toMatchObject({ distanceMm: 1000, widthMm: 1000, heightMm: 800, rectX: 1100, rectY: 1100 });
        const text = readFileSync(result.file, "utf8");
        expect(text).toMatch(/^calibration_distance_mm = 1000$/m);
        expect(text).toMatch(/^calibration_width_mm = 1000$/m);
        expect(text).toMatch(/^calibration_height_mm = 800$/m);

        const h = Lh2Homography.fromWire(Lh2Calibration.fromFile(result.file).matrices[0]);
        const br = COUNTS[Lh2Corner.BottomRight];
        const [x, y] = Lh2Homography.apply(h, Lh2Homography.cameraPoint({ lhIndex: 0, count1: br[0], count2: br[1] }));
        expect(Math.abs(x - 2100)).toBeLessThan(1);
        expect(Math.abs(y - 1900)).toBeLessThan(1);
    });
});

describe("POST /v1/lh2/calibration/correct", () => {

    let dir: string;
    const originalDir = lh2Config.calibrationDir;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "lh2-correct-"));
        lh2Config.calibrationDir = dir;
    });

    afterEach(() => {
        lh2Config.calibrationDir = originalDir;
        rmSync(dir, { recursive: true, force: true });
    });

    // Matriz da calibração real de 27/11 (lado 800, canal 13, layout do PyDotBot).
    const REAL = Lh2Homography.toWire([1639.62, 3983.394, 1968.438, -745.293, 7402.737, 1605.531, -0.179, 1.867, 1]);
    const AREA = { areaWidthMm: 1200, areaHeightMm: 1200, rectXMm: 200, rectYMm: 200 };

    // Mari com uma calibração carregada de um TOML (com [metadata]).
    const loaded = (distanceMm = 800) => {
        const setup = mariSetup(false);
        const path = Lh2Calibration.forStation(12, REAL, "teste").saveToml(dir, { distanceMm, tag: "arena-taak" });
        (setup.adapter as any).calibration = Lh2Calibration.fromFile(path);
        return { ...setup, path };
    };

    // Ponto da câmera que a matriz leva até (u, v): resolve H·p = (u, v).
    const cameraAt = (h: number[], [u, v]: [number, number]): [number, number] => {
        const a = h[0] - u * h[6], b = h[1] - u * h[7], c = u * h[8] - h[2];
        const d = h[3] - v * h[6], e = h[4] - v * h[7], f = v * h[8] - h[5];
        const det = a * e - b * d;
        return [(c * e - b * f) / det, (a * f - c * d) / det];
    };

    it("lado digitado errado: digitou 500, era 800 - o mesmo ponto físico passa a ler o número certo", () => {
        const { adapter, service, path } = loaded(500);

        const result = service.correct({ distanceMm: 800 });

        expect(result).toMatchObject({ from: path, stationCount: 13, channels: [13], metadata: { distanceMm: 800, widthMm: 800, heightMm: 800, area: null, correctedFrom: basename(path) } });
        expect(adapter.lh2Calibration()!.source).toBe(result.file);

        // O canto top-left lia (1000, 1000) com lado 500; com 800 lê (1600, 1600).
        const camera = cameraAt(Lh2Homography.fromWire(REAL), [1000, 1000]);
        const [x, y] = Lh2Homography.apply(Lh2Homography.fromWire(Lh2Calibration.fromFile(result.file).matrices[12]), camera);
        expect(x).toBeCloseTo(1600, 1);
        expect(y).toBeCloseTo(1600, 1);
    });

    it("posição na área digitada errado: só o que veio muda, o tamanho continua", () => {
        const { fleet, service, path } = loaded(800);

        const result = service.correct({ ...AREA });

        expect(result).toMatchObject({
            from: path, notInBootloader: [B],
            metadata: { widthMm: 800, heightMm: 800, rectX: 1200, rectY: 1200, area: { x: 1000, y: 1000, width: 1200, height: 1200 }, correctedFrom: basename(path) },
        });
        expect(result.marked).toEqual(expect.arrayContaining([A, B]));

        // Canto TL: (1600, 1600) no layout do PyDotBot → (1200, 1200) na área.
        const camera = cameraAt(Lh2Homography.fromWire(REAL), [1600, 1600]);
        const [x, y] = Lh2Homography.apply(Lh2Homography.fromWire(Lh2Calibration.fromFile(result.file).matrices[12]), camera);
        expect(x).toBeCloseTo(1200, 6);
        expect(y).toBeCloseTo(1200, 6);

        // Slots zerados continuam zerados; robô novo recebe a calibração nova.
        expect(Lh2Calibration.fromFile(result.file).stations).toEqual([12]);
        fleet.onStatus("0000000000000003", status(SwarmitDeviceStatus.Bootloader));
        expect(fleet.get("0000000000000003")?.forceCalibration).toBe(true);

        // Corrigir de novo só a altura (retângulo): a área e a posição ficam.
        const again = service.correct({ widthMm: 800, heightMm: 600 });
        expect(again.metadata).toMatchObject({ widthMm: 800, heightMm: 600, rectX: 1200, rectY: 1200, area: { width: 1200, height: 1200 } });
    });

    it("sem calibração, sem [metadata], nada para corrigir ou campos soltos = erro", () => {
        expect(() => mariService(false).correct({ ...AREA })).toThrow(ConflictException);
        expect(() => mariService(true).correct({ ...AREA })).toThrow(/metadata/);
        expect(() => loaded().service.correct({})).toThrow(/Nada para corrigir/);
        expect(() => loaded().service.correct({ distanceMm: 800 })).toThrow(/Nada para corrigir/);
        expect(() => loaded().service.correct({ areaWidthMm: 1200 })).toThrow(/juntos/);
        expect(() => loaded().service.correct({ ...AREA, rectXMm: 500 })).toThrow(BadRequestException);
    });

    it("captura em andamento = 409", () => {
        const { service } = loaded();
        service.startCapture({ address: A });
        expect(() => service.correct({ ...AREA })).toThrow(ConflictException);
    });
});

import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ArenaService } from "../Classes/Arena/Arena.Service";
import { MariGatewayAdapter } from "../adapter/Mari/MariGateway.Adapter";
import { arenaConfig } from "../config/arena.config";
import { edgeConfig } from "../config/edge.config";
import { gatewayIdentity } from "../config/gateway.config";
import { lh2Config } from "../config/lh2.config";
import { mariConfig } from "../config/Mari.Config";
import { EdgeSocketEvents } from "../Enums/EdgeSocketEvents.enum";
import { Lh2Calibration } from "../Protocols/Swarmit/Lh2Calibration";
import { Lh2Homography } from "../Protocols/Swarmit/Lh2Homography";
import { Lh2Layout } from "../Protocols/Swarmit/Lh2Layout";

// Matriz da calibração real de 27/11 (lado 800, canal 13).
const REAL = Lh2Homography.toWire([1639.62, 3983.394, 1968.438, -745.293, 7402.737, 1605.531, -0.179, 1.867, 1]);

const fakeUplink = () => {
    const listeners: (() => void)[] = [];
    return { onConnect: (fn: () => void) => listeners.push(fn), emit: jest.fn(), connect: () => listeners.forEach((fn) => fn()) };
};

const setup = (gateway: any) => {
    const uplink = fakeUplink();
    const ws = { emitArena: jest.fn() };
    const service = new ArenaService(gateway, uplink as any, ws as any);
    service.onModuleInit();
    return { service, uplink, ws };
};

describe("Arena e identidade do gateway", () => {

    let dir: string;
    const original = { dir: lh2Config.calibrationDir, net: mariConfig.networkId, edgeId: edgeConfig.edgeId, ...arenaConfig };

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "arena-"));
        lh2Config.calibrationDir = dir;
        mariConfig.networkId = 0x1200;
        edgeConfig.edgeId = "lab-borda";
    });

    afterEach(() => {
        lh2Config.calibrationDir = original.dir;
        mariConfig.networkId = original.net;
        edgeConfig.edgeId = original.edgeId;
        arenaConfig.widthMm = original.widthMm;
        arenaConfig.heightMm = original.heightMm;
        rmSync(dir, { recursive: true, force: true });
    });

    // Mari com uma calibração do canal 13 gravada no layout pedido.
    const mariWith = (layout: Lh2Layout | null) => {
        const adapter = new MariGatewayAdapter();
        if (layout) {
            const path = Lh2Calibration.forStation(12, REAL, "teste").saveToml(dir, { ...layout.metaFields(), tag: "arena-taak" });
            (adapter as any).calibration = Lh2Calibration.fromFile(path);
        }
        return adapter;
    };

    it("identidade: edgeId, modo e network id em 4 hex", () => {
        expect(gatewayIdentity()).toEqual({ edgeId: "lab-borda", mode: expect.stringMatching(/^(mari|mqtt|simulator)$/), networkId: "1200" });
    });

    it("mari com área informada: a área e o retângulo saem da calibração", () => {
        const layout = Lh2Layout.inArea(800, 800, { areaWidthMm: 1200, areaHeightMm: 1200, rectXMm: 200, rectYMm: 200 });
        const view = setup(mariWith(layout)).service.view();

        expect(view).toMatchObject({
            gateway: { edgeId: "lab-borda", networkId: "1200" },
            source: "lh2",
            layout: "area",
            area: { x: 1000, y: 1000, width: 1200, height: 1200 },
            calibration: { x: 1200, y: 1200, width: 800, height: 800 },
            channels: [13],
            version: expect.any(String),
        });
        expect(view.file?.startsWith(dir)).toBe(true);
    });

    it("mari com calibração do PyDotBot: arena de 5 × o retângulo a partir de (0, 0)", () => {
        expect(setup(mariWith(Lh2Layout.legacy(800))).service.view()).toMatchObject({
            layout: "pydotbot",
            area: { x: 0, y: 0, width: 4000, height: 4000 },
            calibration: { x: 1600, y: 1600, width: 800, height: 800 },
        });
    });

    it("mari sem calibração carregada: área desconhecida", () => {
        expect(setup(mariWith(null)).service.view()).toMatchObject({ source: null, layout: null, area: null });
    });

    it("sem LH2 (mqtt/simulator): ARENA_* a partir de (0, 0), ou desconhecida", () => {
        const other = { send: () => {}, onFrameReceived: () => {} };

        arenaConfig.widthMm = 2000;
        arenaConfig.heightMm = 1500;
        expect(setup(other).service.view()).toMatchObject({ source: "config", layout: "config", area: { x: 0, y: 0, width: 2000, height: 1500 }, calibration: null });

        arenaConfig.widthMm = null;
        expect(setup(other).service.view()).toMatchObject({ source: null, area: null });
    });

    it("publica no arena:snapshot a cada conexão do uplink e quando a calibração muda", () => {
        const adapter = mariWith(Lh2Layout.legacy(800));
        const { uplink, ws } = setup(adapter);

        uplink.connect();
        expect(uplink.emit).toHaveBeenCalledWith(EdgeSocketEvents.ArenaSnapshot, expect.objectContaining({ layout: "pydotbot" }));

        // Corrigir a calibração (posição na área) troca a área e avisa todo mundo.
        adapter.correctLh2Calibration(Lh2Layout.inArea(800, 800, { areaWidthMm: 1200, areaHeightMm: 1200, rectXMm: 200, rectYMm: 200 }), null);
        expect(ws.emitArena).toHaveBeenCalledTimes(1);
        expect(ws.emitArena.mock.calls[0][0]).toMatchObject({ layout: "area", area: { x: 1000, y: 1000, width: 1200, height: 1200 } });
    });
});

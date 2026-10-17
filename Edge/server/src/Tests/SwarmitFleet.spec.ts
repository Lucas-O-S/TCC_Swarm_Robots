import { SwarmitFleet } from "../adapter/Mari/SwarmitFleet";
import { Lh2Flags, SwarmitDeviceStatus, SwarmitDeviceType } from "../Enums/SwarmitDeviceStatus.enum";
import { SwarmitDeviceInfo, SwarmitStatus } from "../Protocols/Swarmit/Swarmit.Protocol";

const A = "BDF2B04BC00D2725";

const status = (state: SwarmitDeviceStatus, infoGen = 1): SwarmitStatus => ({
    device: SwarmitDeviceType.DotBotV3,
    status: state,
    batteryMv: 3000,
    posX: 0,
    posY: 0,
    resetReason: 0,
    fault: 0,
    fromNs: 0,
    cfsr: 0,
    sfsr: 0,
    pc: 0,
    lr: 0,
    sp: 0,
    psr: 0,
    infoGen,
});

const info = (over: Partial<SwarmitDeviceInfo> = {}): SwarmitDeviceInfo => ({
    infoVersion: 1,
    infoGen: 1,
    bootCount: 1,
    uptimeS: 10,
    blVersion: "",
    netVersion: "",
    imageState: 0,
    imageResult: 0,
    imageSize: 1024,
    imageDigest: "0000000000000000",
    imageName: "dotbot",
    imageVersion: "1.23.0",
    lh2HomographyCount: 0,
    lh2Flags: 0,
    ...over,
});

const CALIBRATED = { lh2HomographyCount: 1, lh2Flags: Lh2Flags.valid | Lh2Flags.fromFlash };

// Robô em Bootloader, já com device-info, no instante 0.
const fleetWith = (policy: { autoStart: boolean; lh2StationCount: number | null }, deviceInfo = info()) => {
    const fleet = new SwarmitFleet();
    fleet.configure(policy);
    fleet.onStatus(A, status(SwarmitDeviceStatus.Bootloader), 0);
    fleet.onDeviceInfo(A, deviceInfo, 0);
    return fleet;
};

describe("SwarmitFleet - device-info", () => {

    it("pede device-info também para robô em Running", () => {
        const fleet = new SwarmitFleet();
        fleet.onStatus(A, status(SwarmitDeviceStatus.Running), 0);
        expect(fleet.plan(0).requestInfo).toEqual([A]);
    });

    it("não pede nada em estado de transição", () => {
        const fleet = new SwarmitFleet();
        fleet.onStatus(A, status(SwarmitDeviceStatus.Programming), 0);
        expect(fleet.plan(0)).toEqual({ requestInfo: [], calibrate: [], start: [] });
    });

    it("lh2Of: desconhecido = não calibrado, e não pisca quando o infoGen muda", () => {
        const fleet = new SwarmitFleet();
        expect(fleet.lh2Of(A)).toEqual({ valid: false, deviceCount: 0 });

        fleet.onStatus(A, status(SwarmitDeviceStatus.Running, 1), 0);
        fleet.onDeviceInfo(A, info(CALIBRATED), 0);
        expect(fleet.lh2Of(A)).toEqual({ valid: true, deviceCount: 1 });

        fleet.onStatus(A, status(SwarmitDeviceStatus.Running, 2), 1000);
        expect(fleet.get(A)?.info).toBeUndefined();
        expect(fleet.lh2Of(A.toLowerCase())).toEqual({ valid: true, deviceCount: 1 });
    });
});

describe("SwarmitFleet - start", () => {

    it("sem calibração carregada, dá START como antes", () => {
        expect(fleetWith({ autoStart: true, lh2StationCount: null }).plan(0).start).toEqual([A]);
    });

    it("com autoStart desligado, não dá START", () => {
        expect(fleetWith({ autoStart: false, lh2StationCount: null }).plan(0).start).toEqual([]);
    });

    it("robô já calibrado vai direto para o START", () => {
        const actions = fleetWith({ autoStart: true, lh2StationCount: 1 }, info(CALIBRATED)).plan(0);
        expect(actions.calibrate).toEqual([]);
        expect(actions.start).toEqual([A]);
    });
});

describe("SwarmitFleet - calibração", () => {

    it("calibra antes do START e só dá START depois de confirmar", () => {
        const fleet = fleetWith({ autoStart: true, lh2StationCount: 1 });

        expect(fleet.plan(0)).toEqual({ requestInfo: [], calibrate: [A], start: [] });

        // Reiniciou depois da última matriz: status novo, infoGen novo.
        fleet.onStatus(A, status(SwarmitDeviceStatus.Bootloader, 2), 1000);
        expect(fleet.plan(1000)).toEqual({ requestInfo: [], calibrate: [], start: [] });
        expect(fleet.plan(2000).requestInfo).toEqual([A]);

        fleet.onDeviceInfo(A, info({ infoGen: 2, bootCount: 2, uptimeS: 1, ...CALIBRATED }), 2100);
        expect(fleet.plan(2100)).toEqual({ requestInfo: [], calibrate: [], start: [A] });
        expect(fleet.get(A)?.calibrateAttempts).toBe(0);
    });

    it("contagem de estações diferente da do arquivo também recalibra", () => {
        const fleet = fleetWith({ autoStart: true, lh2StationCount: 1 }, info({ lh2HomographyCount: 2, lh2Flags: Lh2Flags.valid }));
        expect(fleet.plan(0).calibrate).toEqual([A]);
    });

    it("reenvia no intervalo e, esgotadas as tentativas, segue para o START", () => {
        const fleet = fleetWith({ autoStart: true, lh2StationCount: 1 });

        for (let attempt = 0; attempt < 5; attempt++) {
            const t = attempt * 5000;
            expect(fleet.plan(t).calibrate).toEqual([A]);
            expect(fleet.plan(t + 2000).requestInfo).toEqual([A]);
            // Envio perdido: mesmo boot, ainda sem calibração.
            fleet.onDeviceInfo(A, info({ uptimeS: 20 + attempt }), t + 2100);
            if (attempt < 4) expect(fleet.plan(t + 2100).calibrate).toEqual([]);
        }

        expect(fleet.plan(22100)).toEqual({ requestInfo: [], calibrate: [], start: [A] });
        expect(fleet.takeCalibrationFailures()).toEqual([A]);
        expect(fleet.takeCalibrationFailures()).toEqual([]);
    });

    it("forceCalibrate reenvia para robô já calibrado até ver outro boot", () => {
        const fleet = fleetWith({ autoStart: false, lh2StationCount: 1 }, info(CALIBRATED));
        expect(fleet.plan(0).calibrate).toEqual([]);

        expect(fleet.forceCalibrate(A.toLowerCase())).toEqual([A]);
        expect(fleet.plan(10).calibrate).toEqual([A]);

        // Resposta ainda do boot antigo: o envio pode ter se perdido.
        expect(fleet.plan(2010).requestInfo).toEqual([A]);
        fleet.onDeviceInfo(A, info({ uptimeS: 15, ...CALIBRATED }), 2100);
        expect(fleet.plan(2100).calibrate).toEqual([]);
        expect(fleet.plan(5010).calibrate).toEqual([A]);

        // Outro boot: o robô processou, o force acaba.
        expect(fleet.plan(7010).requestInfo).toEqual([A]);
        fleet.onDeviceInfo(A, info({ bootCount: 2, uptimeS: 1, ...CALIBRATED }), 7100);
        expect(fleet.get(A)?.forceCalibration).toBe(false);
        expect(fleet.plan(20000)).toEqual({ requestInfo: [], calibrate: [], start: [] });
    });

    it("forceCalibrate de robô desconhecido não marca ninguém", () => {
        expect(fleetWith({ autoStart: false, lh2StationCount: 1 }).forceCalibrate("0000000000000001")).toEqual([]);
    });
});

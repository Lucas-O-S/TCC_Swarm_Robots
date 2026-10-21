import { MariGatewayAdapter } from "../adapter/Mari/MariGateway.Adapter";
import { SwarmitFleet } from "../adapter/Mari/SwarmitFleet";
import { HdlcCodec } from "../Protocols/Mari/Hdlc/HdlcCodec";
import { MariProtocol } from "../Protocols/Mari/Mari.Protocol";
import { Lh2Calibration } from "../Protocols/Swarmit/Lh2Calibration";
import { SwarmitDeviceInfo, SwarmitStatus } from "../Protocols/Swarmit/Swarmit.Protocol";
import { NextProto } from "../Enums/NextProto.enum";
import { SwarmitDeviceStatus, SwarmitDeviceType } from "../Enums/SwarmitDeviceStatus.enum";
import { SwarmitPayloadType } from "../Enums/SwarmitPayloadType.enum";

const A = "BDF2B04BC00D2725";

const matrix = (seed: number) => {
    const buffer = Buffer.alloc(36);
    for (let i = 0; i < 9; i++) buffer.writeInt32LE((seed + i) * 1000 - 4500, i * 4);
    return buffer;
};

const status: SwarmitStatus = {
    device: SwarmitDeviceType.DotBotV3, status: SwarmitDeviceStatus.Bootloader, batteryMv: 3000,
    posX: 0, posY: 0, resetReason: 0, fault: 0, fromNs: 0,
    cfsr: 0, sfsr: 0, pc: 0, lr: 0, sp: 0, psr: 0, infoGen: 1,
};

const info: SwarmitDeviceInfo = {
    infoVersion: 1, infoGen: 1, bootCount: 1, uptimeS: 10, blVersion: "", netVersion: "",
    imageState: 0, imageResult: 0, imageSize: 1024, imageDigest: "0000000000000000",
    imageName: "dotbot", imageVersion: "1.23.0", lh2HomographyCount: 0, lh2Flags: 0,
};

// Adapter sem onModuleInit (não abre serial nem lê .env): serial falsa que
// guarda o que foi escrito, calibração de 2 estações já carregada.
const adapterWithFakeSerial = () => {
    const writes: Buffer[] = [];
    const adapter = new MariGatewayAdapter();
    const internals = adapter as any;
    const calibration = Lh2Calibration.fromPayload(Buffer.concat([Buffer.from([2]), matrix(1), matrix(2)]));

    internals.port = { write: (bytes: Buffer) => writes.push(bytes) };
    internals.calibration = calibration;

    const fleet: SwarmitFleet = internals.fleet;
    fleet.configure({ autoStart: true, lh2StationCount: calibration.count });
    fleet.onStatus(A, status);
    fleet.onDeviceInfo(A, info);

    return { adapter, internals, writes };
};

// HDLC -> [EdgeEvent] + Mari frame -> pacote SwarmIT.
const unwrap = (bytes: Buffer) => {
    const payload = new HdlcCodec().hdlcDecode(bytes);
    return MariProtocol.parseMariFrame(payload.subarray(1));
};

describe("MariGatewayAdapter - envio da calibração LH2", () => {

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("manda uma matriz por estação, endereçada, em ordem e espaçada, sem START", () => {
        const { internals, writes } = adapterWithFakeSerial();

        internals.driveFleet();
        expect(writes).toHaveLength(1);

        jest.advanceTimersByTime(300);
        expect(writes).toHaveLength(2);

        const frames = writes.map(unwrap);

        frames.forEach((frame, index) => {
            expect(frame.header.destination).toBe(A);
            expect(frame.header.nextProto).toBe(NextProto.SWARMIT_TESTBED);
            expect(frame.payload[0]).toBe(SwarmitPayloadType.SWARMIT_LH2_CALIBRATION);
            expect(frame.payload.readUInt32LE(1)).toBe(2);
            expect(frame.payload.readUInt32LE(5)).toBe(index);
            expect(frame.payload.subarray(9).equals(matrix(index + 1))).toBe(true);
        });
    });

    it("onModuleDestroy cancela as matrizes que ainda não saíram", () => {
        const { adapter, internals, writes } = adapterWithFakeSerial();

        internals.driveFleet();
        adapter.onModuleDestroy();
        jest.advanceTimersByTime(1000);

        expect(writes).toHaveLength(1);
    });

    it("forceLh2Calibration sem arquivo carregado é erro", () => {
        const { adapter, internals } = adapterWithFakeSerial();
        internals.calibration = null;
        expect(() => adapter.forceLh2Calibration(A)).toThrow("nenhuma calibração carregada");
    });
});

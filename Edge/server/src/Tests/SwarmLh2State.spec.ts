import { SwarmService } from "../Classes/Swarm/Swarm.Service";
import { RobotState } from "../Classes/Swarm/Robot.State";
import { GatewayAdapter } from "../adapter/GatewayAdapter.interface";
import { Frame, Protocol } from "../Protocols/Protocol";
import { PayloadCodec } from "../Protocols/Protocol.Codec";
import { DotBotAdvertisementFields } from "../Protocols/Wrappers/Decode/DotBotAdvertisement.wrapper";
import { PayloadType } from "../Enums/PayloadType.enum";
import { HOST_ADDRESS } from "../Constants/Address.Constants";

const A = "BDF2B04BC00D2725";

// Mesmo advertisement do robô fake do SimulatorGatewayAdapter.
const SIMULATOR_BODY = Buffer.from("01a6ffe8030000d0070000e40cce32019cffffffc8000000dc0500002003000003", "hex");

// Advertisement montado campo a campo (firmware 1.23.0: calibrated fixo 0xFF).
const advertisementBody = (over: Record<string, number> = {}) => {
    const base: Record<string, number> = { calibrated: 0xFF, direction: 90, pos_x: 1000, pos_y: 2000, battery: 3000 };
    const values = { ...base, ...over };
    return new PayloadCodec(DotBotAdvertisementFields.map((f) => ({ ...f, value: values[f.field] ?? 0 }))).Payload;
};

const advertisement = (body: Buffer) => Protocol.buildFrame(new Frame(
    Protocol.buildHeader(HOST_ADDRESS, undefined, undefined, A),
    PayloadType.DOTBOT_ADVERTISEMENT,
    body,
));

const MARI: GatewayAdapter = {
    send: () => {},
    onFrameReceived: () => {},
    lh2Of: (address) => (address === A ? { valid: true, deviceCount: 1 } : null),
};

const SIMULATOR: GatewayAdapter = { send: () => {}, onFrameReceived: () => {} };

// SwarmService sem onModuleInit (sem timer): o frame entra direto no handleFrame
// e o estado é pego no que iria para o socket.io.
const stateFor = (gateway: GatewayAdapter, body: Buffer = SIMULATOR_BODY): RobotState => {
    const queued: RobotState[] = [];
    const ws = { queueState: (s: RobotState) => queued.push(s), emitJoined: () => {}, emitStatus: () => {} };
    const service = new SwarmService(gateway, ws as any);
    (service as any).handleFrame(advertisement(body));
    return queued[0];
};

describe("SwarmService - lh2 no estado", () => {

    it("transporte com SwarmIT (Mari) manda o lh2 no robot:states e no GET", () => {
        expect(JSON.parse(JSON.stringify(stateFor(MARI))).lh2).toEqual({ valid: true, deviceCount: 1 });
    });

    it("transporte sem SwarmIT (simulador/MQTT) manda lh2 = null", () => {
        expect(JSON.parse(JSON.stringify(stateFor(SIMULATOR)))).toHaveProperty("lh2", null);
    });
});

describe("SwarmService - posição LH2", () => {

    it("robô real sem fix (0,0) fica sem posição", () => {
        expect(stateFor(MARI, advertisementBody({ pos_x: 0, pos_y: 0 })).position).toBeNull();
    });

    it("no simulador (0,0) é posição de verdade", () => {
        expect(stateFor(SIMULATOR, advertisementBody({ pos_x: 0, pos_y: 0 })).position).toMatchObject({ x: 0, y: 0 });
    });

    it("0xFFFFFFFF continua sendo sem leitura", () => {
        expect(stateFor(SIMULATOR, advertisementBody({ pos_x: 0xFFFFFFFF })).position).toBeNull();
    });

    it.each([-1000, -1])("direction %i = sem heading", (direction) => {
        expect(stateFor(MARI, advertisementBody({ direction })).position).toMatchObject({ x: 1000, y: 2000, direction: null });
    });

    it("posição e direction válidas passam como vieram", () => {
        expect(stateFor(MARI, advertisementBody()).position).toMatchObject({ x: 1000, y: 2000, direction: 90 });
    });
});

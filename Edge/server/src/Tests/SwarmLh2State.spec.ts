import { SwarmService } from "../Classes/Swarm/Swarm.Service";
import { RobotState } from "../Classes/Swarm/Robot.State";
import { GatewayAdapter } from "../adapter/GatewayAdapter.interface";
import { Frame, Protocol } from "../Protocols/Protocol";
import { PayloadType } from "../Enums/PayloadType.enum";
import { HOST_ADDRESS } from "../Constants/Address.Constants";

const A = "BDF2B04BC00D2725";

// Mesmo advertisement do robô fake do SimulatorGatewayAdapter.
const advertisement = () => Protocol.buildFrame(new Frame(
    Protocol.buildHeader(HOST_ADDRESS, undefined, undefined, A),
    PayloadType.DOTBOT_ADVERTISEMENT,
    Buffer.from("01a6ffe8030000d0070000e40cce32019cffffffc8000000dc0500002003000003", "hex"),
));

// SwarmService sem onModuleInit (sem timer): o frame entra direto no handleFrame
// e o estado é pego no que iria para o socket.io.
const stateFor = (gateway: GatewayAdapter): RobotState => {
    const queued: RobotState[] = [];
    const ws = { queueState: (s: RobotState) => queued.push(s), emitJoined: () => {}, emitStatus: () => {} };
    const service = new SwarmService(gateway, ws as any);
    (service as any).handleFrame(advertisement());
    return queued[0];
};

describe("SwarmService - lh2 no estado", () => {

    it("transporte com SwarmIT (Mari) manda o lh2 no robot:states e no GET", () => {
        const gateway: GatewayAdapter = {
            send: () => {},
            onFrameReceived: () => {},
            lh2Of: (address) => (address === A ? { valid: true, deviceCount: 1 } : null),
        };

        const state = stateFor(gateway);

        expect(JSON.parse(JSON.stringify(state)).lh2).toEqual({ valid: true, deviceCount: 1 });
    });

    it("transporte sem SwarmIT (simulador/MQTT) manda lh2 = null", () => {
        const state = stateFor({ send: () => {}, onFrameReceived: () => {} });

        const json = JSON.parse(JSON.stringify(state));
        expect(json).toHaveProperty("lh2", null);
    });
});

import { SwarmitProtocol } from "../Protocols/Swarmit/Swarmit.Protocol";

// Formatos do swarmit 0.9.0 (testbed/protocol.py): PayloadLH2Capture é vazio,
// PayloadEvent = timestamp u32 + count u8 + dados; a captura vem com a tag
// 0xCA e amostras [lh_index u8][count1 u32 LE][count2 u32 LE].
const sample = (lh: number, c1: number, c2: number) => {
    const b = Buffer.alloc(9);
    b.writeUInt8(lh, 0);
    b.writeUInt32LE(c1, 1);
    b.writeUInt32LE(c2, 5);
    return b;
};

const eventLog = (data: Buffer, timestamp = 1234) => {
    const head = Buffer.alloc(6);
    head.writeUInt8(0x89, 0);
    head.writeUInt32LE(timestamp, 1);
    head.writeUInt8(data.length, 5);
    return Buffer.concat([head, data]);
};

describe("SwarmitProtocol - captura LH2", () => {

    it("pedido de captura é só o byte 0xA2", () => {
        expect(SwarmitProtocol.buildLh2Capture()).toEqual(Buffer.from([0xA2]));
    });

    it("lê o EVENT_LOG e as amostras da captura", () => {
        const data = Buffer.concat([Buffer.from([0xCA]), sample(0, 31000, 69000), sample(2, 5, 6)]);
        const log = SwarmitProtocol.parseEventLog(eventLog(data));

        expect(log?.timestamp).toBe(1234);
        expect(SwarmitProtocol.parseLh2Samples(log!.data)).toEqual([
            { lhIndex: 0, count1: 31000, count2: 69000 },
            { lhIndex: 2, count1: 5, count2: 6 },
        ]);
    });

    it("log de texto comum não vira amostra", () => {
        const log = SwarmitProtocol.parseEventLog(eventLog(Buffer.from("boot ok")));
        expect(SwarmitProtocol.parseLh2Samples(log!.data)).toEqual([]);
    });

    it("descarta EVENT_LOG cortado e outro tipo de pacote", () => {
        const cut = eventLog(Buffer.from([0xCA, 1, 2, 3])).subarray(0, 8);
        expect(SwarmitProtocol.parseEventLog(cut)).toBeNull();
        expect(SwarmitProtocol.parseEventLog(Buffer.from([0x80, 0, 0, 0, 0, 0]))).toBeNull();
    });
});

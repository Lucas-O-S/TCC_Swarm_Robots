import { HdlcCodec } from "../Protocols/Mari/HdlcCodec";
import { HdlcHandler } from "../Protocols/Mari/HdlcHandler";

const codec = new HdlcCodec();
const hdlcEncode = (payload: Buffer) => codec.hdlcEncode(payload);
const hdlcDecode = (frame: Buffer) => codec.hdlcDecode(frame);

const vec: [Buffer, string][] = [
    [Buffer.from("test"),                   "7e7465737488077e"],
    [Buffer.from(""),                       "7e00007e"],
    [Buffer.from("0000f6f6f6f6", "hex"),    "7e0000f6f6f6f6b22b7e"],
    [Buffer.from("00010a0a0a", "hex"),      "7e00010a0a0a9cf27e"],
    [Buffer.from("~test~"),                 "7e7d5e746573747d5e9da67e"],
    [Buffer.from("~test}"),                 "7e7d5e746573747d5d06947e"],
    [Buffer.from("e7943aa6", "hex"),        "7ee7943aa6837d5e7e"],
    [Buffer.from("27245782", "hex"),        "7e27245782137d5d7e"],
];

describe("HDLC", () => {
    it.each(vec)("encode bate com o marilib", (input, expected) => {
        expect(hdlcEncode(input).toString("hex")).toBe(expected);
    });

    it.each(vec)("decode é o inverso do encode", (input) => {
        expect(hdlcDecode(hdlcEncode(input)).toString("hex")).toBe(input.toString("hex"));
    });

    it("handler remonta frames de um fluxo picado", () => {
        const frames = [Buffer.from("deadbeef", "hex"), Buffer.from("~test~"), Buffer.from("0102030405", "hex")];
        const stream = Buffer.concat(frames.map(hdlcEncode));
        const got: string[] = [];
        const h = new HdlcHandler((p) => got.push(p.toString("hex")));
        for (let i = 0; i < stream.length; i += 3) h.push(stream.subarray(i, i + 3)); // pedaços de 3 bytes
        expect(got).toEqual(frames.map((f) => f.toString("hex")));
    });
});
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Lh2Calibration } from "../Protocols/Swarmit/Lh2Calibration";

// Matriz de uma estação no formato do fio: 9 × int32 LE (valor × 1000).
const matrix = (seed: number) => {
    const buffer = Buffer.alloc(36);
    for (let i = 0; i < 9; i++) buffer.writeInt32LE((seed + i) * 1000 - 4500, i * 4);
    return buffer;
};

const payload = (...matrices: Buffer[]) => Buffer.concat([Buffer.from([matrices.length]), ...matrices]);

// Mesmo texto que o save_calibration do PyDotBot 0.30.0 escreve.
const toml = (data: Buffer, schema = 1) =>
    `schema_version = ${schema}\n` +
    "\n" +
    "[metadata]\n" +
    'created_at = "2026-10-17T12:00:00Z"\n' +
    "calibration_distance_mm = 500\n" +
    `num_lh_stations = ${data[0]}\n` +
    "\n" +
    "[calibration]\n" +
    "# 1-byte homography count + N x 36-byte int32 LE matrices,\n" +
    "# hex-encoded. Same bytes as the legacy calibration.out.\n" +
    `data_hex = "${data.toString("hex")}"\n`;

describe("Lh2Calibration.fromPayload", () => {

    it("fatia uma matriz por estação", () => {
        const cal = Lh2Calibration.fromPayload(payload(matrix(1), matrix(2)));
        expect(cal.count).toBe(2);
        expect(cal.matrices[0].equals(matrix(1))).toBe(true);
        expect(cal.matrices[1].equals(matrix(2))).toBe(true);
    });

    it("recusa payload vazio", () => {
        expect(() => Lh2Calibration.fromPayload(Buffer.alloc(0))).toThrow("vazia");
    });

    it.each([0, 17])("recusa contagem %i", (count) => {
        expect(() => Lh2Calibration.fromPayload(Buffer.from([count]))).toThrow("estações");
    });

    it("recusa tamanho que não bate com a contagem", () => {
        const data = payload(matrix(1));
        expect(() => Lh2Calibration.fromPayload(data.subarray(0, data.length - 1))).toThrow("esperava 37 B");
        expect(() => Lh2Calibration.fromPayload(Buffer.concat([data, Buffer.from([0])]))).toThrow("esperava 37 B");
    });

    it("slot zerado é estação sem calibração", () => {
        const cal = Lh2Calibration.fromPayload(payload(Buffer.alloc(36), matrix(1)));
        expect(cal.count).toBe(2);
        expect(cal.stations).toEqual([1]);
    });

    it("recusa tudo zerado (estouro no PyDotBot)", () => {
        expect(() => Lh2Calibration.fromPayload(payload(Buffer.alloc(36), Buffer.alloc(36)))).toThrow("todas as matrizes zeradas");
    });

    it("forStations põe cada matriz no slot do índice e zera os outros", () => {
        const cal = Lh2Calibration.forStations(new Map([[6, matrix(1)], [2, matrix(2)]]), "captura");
        expect(cal.count).toBe(7);
        expect(cal.stations).toEqual([2, 6]);
        expect(cal.matrices[2].equals(matrix(2))).toBe(true);
        expect(cal.matrices[6].equals(matrix(1))).toBe(true);
        expect(cal.payload.length).toBe(1 + 7 * 36);
        expect(() => Lh2Calibration.forStations(new Map([[16, matrix(1)]]), "captura")).toThrow("fora de 0..15");
        expect(() => Lh2Calibration.forStations(new Map(), "captura")).toThrow("nenhuma estação");
    });

    it("latestToml olha só os calibration*.toml da pasta", () => {
        const dir = mkdtempSync(join(tmpdir(), "lh2-latest-"));
        try {
            expect(Lh2Calibration.latestToml(dir)).toBeNull();
            expect(Lh2Calibration.latestToml(join(dir, "nao-existe"))).toBeNull();

            const old = join(dir, "calibration-a.toml");
            writeFileSync(old, "");
            utimesSync(old, 1000, 1000);
            const other = join(dir, "outra-coisa.toml");
            writeFileSync(other, "");
            utimesSync(other, 3000, 3000);
            const latest = join(dir, "calibration-b.toml");
            writeFileSync(latest, "");
            utimesSync(latest, 2000, 2000);

            expect(Lh2Calibration.latestToml(dir)).toBe(latest);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe("Lh2Calibration.payloadFromToml", () => {

    it("devolve os bytes do data_hex", () => {
        const data = payload(matrix(1));
        expect(Lh2Calibration.payloadFromToml(toml(data)).equals(data)).toBe(true);
    });

    it("recusa outro schema_version", () => {
        expect(() => Lh2Calibration.payloadFromToml(toml(payload(matrix(1)), 3))).toThrow("schema_version 3");
    });

    it("recusa TOML sem data_hex", () => {
        expect(() => Lh2Calibration.payloadFromToml("schema_version = 1\n")).toThrow("data_hex");
    });
});

describe("Lh2Calibration.fromFile", () => {

    let dir: string;

    beforeAll(() => { dir = mkdtempSync(join(tmpdir(), "lh2-")); });

    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it("lê o .toml e o .out legado com o mesmo resultado", () => {
        const data = payload(matrix(1));
        const tomlPath = join(dir, "calibration-2026-10-17T12-00-00Z.toml");
        const outPath = join(dir, "calibration.out");
        writeFileSync(tomlPath, toml(data));
        writeFileSync(outPath, data);

        const fromToml = Lh2Calibration.fromFile(tomlPath);
        const fromOut = Lh2Calibration.fromFile(outPath);

        expect(fromToml.count).toBe(1);
        expect(fromToml.source).toBe(tomlPath);
        expect(fromToml.matrices[0].equals(fromOut.matrices[0])).toBe(true);
    });
});

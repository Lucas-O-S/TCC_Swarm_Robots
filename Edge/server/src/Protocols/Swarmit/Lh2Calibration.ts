import { readFileSync } from "fs";
import { extname } from "path";
import { LH2_MATRIX_LEN, LH2_MAX_STATIONS } from "src/Constants/Lh2.Constants";

// schema_version que o PyDotBot 0.30.0 grava. Outro valor = outro formato
// (a 1.25.0 do firmware usa schema 3, com outro modelo de LH2).
const TOML_SCHEMA_VERSION = 1;

// Calibração LH2 lida do arquivo do PyDotBot, já fatiada em uma matriz por
// estação - cada uma vai num SWARMIT_LH2_CALIBRATION (buildLh2Calibration).
// Os bytes já estão no formato do fio (9 × int32 LE, valor × 1000): aqui só
// se valida e fatia, sem conta nenhuma.
export class Lh2Calibration {

    private constructor(
        public readonly matrices: Buffer[],
        public readonly source: string,
    ) {}

    get count(): number {
        return this.matrices.length;
    }

    static fromFile(path: string): Lh2Calibration {

        const raw = readFileSync(path);

        const payload = extname(path) === ".toml"
            ? Lh2Calibration.payloadFromToml(raw.toString("utf8"), path)
            : raw;

        return Lh2Calibration.fromPayload(payload, path);
    }

    // 1 B de contagem + N × 36 B (mesmo formato do calibration.out).
    static fromPayload(payload: Buffer, source: string = "payload"): Lh2Calibration {

        if (payload.length < 1)
            throw new Error(`${source}: calibração vazia`);

        const count = payload[0];

        if (count < 1 || count > LH2_MAX_STATIONS)
            throw new Error(`${source}: ${count} estações (aceito de 1 a ${LH2_MAX_STATIONS})`);

        const expected = 1 + count * LH2_MATRIX_LEN;

        if (payload.length !== expected)
            throw new Error(`${source}: ${payload.length} B, esperava ${expected} B para ${count} estação(ões)`);

        const matrices: Buffer[] = [];

        for (let i = 0; i < count; i++) {

            const start = 1 + i * LH2_MATRIX_LEN;

            const matrix = payload.subarray(start, start + LH2_MATRIX_LEN);

            // O PyDotBot grava 36 zeros quando o valor estoura o int32:
            // mandar isso "calibra" o robô com uma matriz inútil.
            if (matrix.every((b) => b === 0))
                throw new Error(`${source}: matriz da estação ${i} zerada - recalibre`);

            // Cópia: não fica preso ao buffer do arquivo.
            matrices.push(Buffer.from(matrix));
        }

        return new Lh2Calibration(matrices, source);
    }

    // O PyDotBot gera o TOML sempre do mesmo jeito (f-string): schema_version
    // na 1ª linha e data_hex numa linha só. Regex basta, sem lib de TOML.
    static payloadFromToml(text: string, source: string = "toml"): Buffer {

        const schema = /^\s*schema_version\s*=\s*(\d+)/m.exec(text);

        if (!schema || Number(schema[1]) !== TOML_SCHEMA_VERSION)
            throw new Error(`${source}: schema_version ${schema?.[1] ?? "ausente"} (só leio ${TOML_SCHEMA_VERSION})`);

        const hex = /^\s*data_hex\s*=\s*"([0-9a-fA-F]*)"/m.exec(text);

        if (!hex)
            throw new Error(`${source}: sem [calibration].data_hex`);

        return Buffer.from(hex[1], "hex");
    }
}

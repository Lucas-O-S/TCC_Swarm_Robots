import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { extname, join } from "path";
import { LH2_MATRIX_LEN, LH2_MAX_STATIONS } from "src/Constants/Lh2.Constants";

// schema_version que o PyDotBot 0.30.0 grava. Outro valor = outro formato
// (a 1.25.0 do firmware usa schema 3, com outro modelo de LH2).
const TOML_SCHEMA_VERSION = 1;

// Metadados que vão no [metadata] do TOML, como o PyDotBot grava.
export interface Lh2CalibrationMeta {
    distanceMm: number;
    tag?: string;
    createdAt?: Date;
}

// Calibração LH2 lida do arquivo do PyDotBot, já fatiada em uma matriz por
// estação - cada uma vai num SWARMIT_LH2_CALIBRATION (buildLh2Calibration).
// Os bytes já estão no formato do fio (9 × int32 LE, valor × 1000): aqui só
// se valida e fatia, sem conta nenhuma.
//
// A posição na lista é o índice da estação (canal - 1): o firmware guarda e
// usa a homografia por índice (homography_matrix[lh_index] no dotbot-libs).
// Calibrar só o canal N exige N slots, com os anteriores zerados - slot
// zerado = estação sem calibração, como no PyDotBot (LH2Homography começa
// zerada) e no net core (zera o buffer no índice 0).
export class Lh2Calibration {

    private constructor(
        public readonly matrices: Buffer[],
        public readonly source: string,
    ) {}

    // Slots enviados (= lh2HomographyCount que o robô reporta), não estações calibradas.
    get count(): number {
        return this.matrices.length;
    }

    // Índices com matriz de verdade (canal = índice + 1).
    get stations(): number[] {
        return this.matrices.flatMap((matrix, index) => (Lh2Calibration.isEmpty(matrix) ? [] : [index]));
    }

    // 1 B de contagem + N × 36 B: o data_hex do TOML e o calibration.out.
    get payload(): Buffer {
        return Buffer.concat([Buffer.from([this.count]), ...this.matrices]);
    }

    // Calibração calculada pela própria borda (captura LH2), passando pela
    // mesma validação do arquivo.
    static fromMatrices(matrices: Buffer[], source: string): Lh2Calibration {
        return Lh2Calibration.fromPayload(Buffer.concat([Buffer.from([matrices.length]), ...matrices]), source);
    }

    // Uma estação só, no slot do índice dela; os anteriores vão zerados.
    static forStation(station: number, matrix: Buffer, source: string): Lh2Calibration {
        if (!Number.isInteger(station) || station < 0 || station >= LH2_MAX_STATIONS)
            throw new Error(`estação ${station} fora de 0..${LH2_MAX_STATIONS - 1}`);

        const empty = Array.from({ length: station }, () => Buffer.alloc(LH2_MATRIX_LEN));
        return Lh2Calibration.fromMatrices([...empty, matrix], source);
    }

    // Mesmo texto do save_calibration do PyDotBot 0.30.0 (schema 1), para o
    // arquivo servir também ao `dotbot swarm lh2-calibration push`.
    toToml(meta: Lh2CalibrationMeta): string {
        const now = meta.createdAt ?? new Date();
        const slug = meta.tag ? Lh2Calibration.slug(meta.tag) : "";

        return (
            `schema_version = ${TOML_SCHEMA_VERSION}\n` +
            "\n" +
            "[metadata]\n" +
            `created_at = "${now.toISOString().slice(0, 19)}Z"\n` +
            `calibration_distance_mm = ${Math.trunc(meta.distanceMm)}\n` +
            `num_lh_stations = ${this.count}\n` +
            (slug ? `tag = "${slug}"\n` : "") +
            "\n" +
            "[calibration]\n" +
            "# 1-byte homography count + N x 36-byte int32 LE matrices,\n" +
            "# hex-encoded. Same bytes as the legacy calibration.out.\n" +
            `data_hex = "${this.payload.toString("hex")}"\n`
        );
    }

    // Grava em dir/calibration[-tag]-<UTC>.toml (nome do PyDotBot) e devolve
    // o caminho. Não grava o calibration.out legado: a borda e o CLI 0.30.0
    // já leem o TOML.
    saveToml(dir: string, meta: Lh2CalibrationMeta): string {
        const now = meta.createdAt ?? new Date();
        const stamp = now.toISOString().slice(0, 19).replace(/:/g, "-") + "Z";
        const slug = meta.tag ? Lh2Calibration.slug(meta.tag) : "";
        const path = join(dir, slug ? `calibration-${slug}-${stamp}.toml` : `calibration-${stamp}.toml`);

        mkdirSync(dir, { recursive: true });
        writeFileSync(path, this.toToml({ ...meta, createdAt: now }), "utf8");
        return path;
    }

    // _slug_tag do PyDotBot: letras ASCII, dígitos, ponto, hífen e sublinhado;
    // tira hífens e pontos das pontas (um "../x" não vira caminho).
    static slug(tag: string): string {
        return tag.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
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

            // Cópia: não fica preso ao buffer do arquivo.
            matrices.push(Buffer.from(matrix));
        }

        // Slot zerado é estação sem calibração (ver o topo). Tudo zerado não
        // calibra nada - e é o que o PyDotBot grava quando estoura o int32.
        if (matrices.every(Lh2Calibration.isEmpty))
            throw new Error(`${source}: todas as matrizes zeradas - recalibre`);

        return new Lh2Calibration(matrices, source);
    }

    private static isEmpty(matrix: Buffer): boolean {
        return matrix.every((b) => b === 0);
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

import { writeFileSync } from "fs";
import { basename } from "path";
import { LH2_CAPTURE_RETRIES, LH2_CAPTURE_TIMEOUT_MS } from "src/Constants/Lh2.Constants";
import { LH2_CORNER_ORDER, Lh2Corner } from "src/Enums/Lh2Corner.enum";
import { Lh2Sample } from "src/Protocols/Swarmit/Swarmit.Protocol";
import { Protocol } from "src/Protocols/Protocol";
import { Lh2Calibration } from "src/Protocols/Swarmit/Lh2Calibration";
import { Lh2Area, Lh2Layout } from "src/Protocols/Swarmit/Lh2Layout";

// Captura LH2 de um robô, canto a canto - o `lh2-calibration collect` do
// PyDotBot 0.30.0 (dotbot/calibration/ota.py), dentro da borda. Sem Nest nem
// serial: quem manda o pedido é o `trigger` que o adapter passa, e quem
// entrega a resposta é o adapter chamando onSamples() quando chega o
// SWARMIT_EVENT_LOG. Assim dá para testar com timers falsos.
//
// Calibra uma estação só, como o PyDotBot. Ele fixa a de índice 0 (canal 1
// da base); aqui vale a que o robô enxergar: a pedida no início da sessão ou,
// sem pedido, a de menor índice na primeira leitura - é a que o firmware
// prefere quando vê mais de uma (o laço do localization_get_position começa
// do índice 0). Escolhida, fica fixa até o fim da sessão: os 4 cantos têm
// que ser da mesma estação. Amostras de outros índices ficam anotadas para
// explicar um timeout.

export interface Lh2CaptureOptions {
    timeoutMs: number;
    retries: number;
}

export const LH2_CAPTURE_DEFAULTS: Lh2CaptureOptions = {
    timeoutMs: LH2_CAPTURE_TIMEOUT_MS,
    retries: LH2_CAPTURE_RETRIES,
};

export interface Lh2CaptureView {
    address: string;
    // Retângulo de calibração (quadrado = largura igual à altura).
    widthMm: number;
    heightMm: number;
    // Para onde cada canto vai (mm no referencial) e a área real (null = layout do PyDotBot).
    references: Record<Lh2Corner, [number, number]>;
    area: Lh2Area | null;
    tag: string | null;
    captured: Partial<Record<Lh2Corner, Lh2Sample>>;
    missing: Lh2Corner[];
    // Canto esperando resposta do robô agora.
    pending: Lh2Corner | null;
    // Estação calibrada (índice = canal - 1). null = ainda não escolhida.
    station: number | null;
    channel: number | null;
    // Estações (índice = canal - 1) que responderam mas não são a calibrada.
    otherStations: number[];
}

// Leituras cruas dos 4 cantos, gravadas ao lado do TOML no solve. Com elas a
// matriz pode ser recalculada (outro lado, outra origem) sem voltar ao chão -
// enquanto a base station não sair do lugar.
export interface Lh2CornersRecord {
    schemaVersion: 1;
    createdAt: string;
    calibrationFile: string;
    address: string;
    // Layout usado no solve: retângulo, canto top-left dele e área (area null = PyDotBot).
    widthMm: number;
    heightMm: number;
    rectX: number;
    rectY: number;
    area: Lh2Area | null;
    tag: string | null;
    station: number;
    channel: number;
    corners: Record<Lh2Corner, Lh2Sample>;
}

// Já tem um canto esperando resposta: um pedido por vez, senão a resposta de
// um canto cai no outro.
export class Lh2CaptureBusyError extends Error {}

// Nenhuma amostra da estação de referência depois de todos os reenvios.
export class Lh2CaptureTimeoutError extends Error {}

interface PendingCapture {
    corner: Lh2Corner;
    attempt: number;
    timer: NodeJS.Timeout | null;
    resolve: (sample: Lh2Sample) => void;
    reject: (error: Error) => void;
}

export class Lh2CaptureSession {

    readonly address: string;

    private readonly samples = new Map<Lh2Corner, Lh2Sample>();

    private readonly otherStations = new Set<number>();

    private pending: PendingCapture | null = null;

    // station null = escolhe pela primeira leitura.
    constructor(
        address: string,
        // Onde o retângulo fica no referencial (ver Lh2Layout) - decide os pontos de referência do solve.
        readonly layout: Lh2Layout,
        readonly tag: string | null,
        private readonly trigger: () => void,
        private readonly options: Lh2CaptureOptions = LH2_CAPTURE_DEFAULTS,
        private station: number | null = null,
    ) {
        this.address = Protocol.normalizeAddress(address);
    }

    get calibratedStation(): number | null {
        return this.station;
    }

    // Pede a captura e espera a amostra da estação calibrada. O pedido
    // não tem ack no enlace: sem resposta no prazo, reenvia (retries vezes).
    // Capturar de novo um canto substitui a amostra anterior.
    capture(corner: Lh2Corner): Promise<Lh2Sample> {
        if (this.pending)
            return Promise.reject(new Lh2CaptureBusyError(`captura do canto ${this.pending.corner} ainda em andamento`));

        return new Promise<Lh2Sample>((resolve, reject) => {
            this.pending = { corner, attempt: 0, timer: null, resolve, reject };
            this.fire();
        });
    }

    // Amostras vindas de um EVENT_LOG. Devolve true se fecharam o canto pendente.
    onSamples(address: string, samples: Lh2Sample[]): boolean {
        const pending = this.pending;
        if (!pending || Protocol.normalizeAddress(address) !== this.address) return false;

        if (this.station === null && samples.length > 0)
            this.station = Math.min(...samples.map((s) => s.lhIndex));

        const sample = samples.find((s) => s.lhIndex === this.station);

        for (const s of samples)
            if (s.lhIndex !== this.station) this.otherStations.add(s.lhIndex);

        if (!sample) return false;

        this.clearPending();
        this.samples.set(pending.corner, sample);
        pending.resolve(sample);
        return true;
    }

    cancel(reason = "captura cancelada"): void {
        const pending = this.pending;
        if (!pending) return;
        this.clearPending();
        pending.reject(new Error(reason));
    }

    isComplete(): boolean {
        return LH2_CORNER_ORDER.every((corner) => this.samples.has(corner));
    }

    // Os 4 cantos, prontos para Lh2Homography.fromCorners.
    corners(): Record<Lh2Corner, Lh2Sample> {
        const missing = this.missing();
        if (missing.length > 0)
            throw new Error(`faltam os cantos: ${missing.join(", ")}`);

        return Object.fromEntries(LH2_CORNER_ORDER.map((c) => [c, this.samples.get(c)!])) as Record<Lh2Corner, Lh2Sample>;
    }

    // Grava as leituras dos cantos em <toml sem extensão>.corners.json e
    // devolve o caminho. Só com os 4 cantos (corners() recusa antes).
    saveCorners(tomlPath: string, createdAt: Date = new Date()): string {
        // Antes de tudo: sem os 4 cantos, recusa (e com eles a estação já foi escolhida).
        const corners = this.corners();
        const record: Lh2CornersRecord = {
            schemaVersion: 1,
            createdAt: createdAt.toISOString(),
            calibrationFile: basename(tomlPath),
            address: this.address,
            widthMm: this.layout.widthMm,
            heightMm: this.layout.heightMm,
            rectX: this.layout.rectX,
            rectY: this.layout.rectY,
            area: this.layout.area,
            // Mesma forma que vai no tag do TOML (slug), para os dois arquivos baterem.
            tag: this.tag ? Lh2Calibration.slug(this.tag) || null : null,
            station: this.station!,
            channel: this.station! + 1,
            corners,
        };

        const path = tomlPath.replace(/\.toml$/, "") + ".corners.json";
        writeFileSync(path, JSON.stringify(record, null, 2) + "\n", "utf8");
        return path;
    }

    view(): Lh2CaptureView {
        return {
            address: this.address,
            widthMm: this.layout.widthMm,
            heightMm: this.layout.heightMm,
            references: Object.fromEntries(LH2_CORNER_ORDER.map((c) => [c, this.layout.corner(c)])) as Record<Lh2Corner, [number, number]>,
            area: this.layout.area,
            tag: this.tag,
            captured: Object.fromEntries(this.samples),
            missing: this.missing(),
            pending: this.pending?.corner ?? null,
            station: this.station,
            channel: this.station === null ? null : this.station + 1,
            otherStations: [...this.otherStations].sort((a, b) => a - b),
        };
    }

    private missing(): Lh2Corner[] {
        return LH2_CORNER_ORDER.filter((corner) => !this.samples.has(corner));
    }

    private fire(): void {
        const pending = this.pending;
        if (!pending) return;

        pending.attempt += 1;
        this.trigger();

        pending.timer = setTimeout(() => {
            if (this.pending !== pending) return;

            if (pending.attempt <= this.options.retries) {
                this.fire();
                return;
            }

            this.clearPending();
            pending.reject(new Lh2CaptureTimeoutError(this.timeoutMessage(pending)));
        }, this.options.timeoutMs);
    }

    private timeoutMessage(pending: PendingCapture): string {
        const base =
            `${this.address} não mandou a leitura do canto ${pending.corner} ` +
            `depois de ${pending.attempt} tentativa(s)`;

        if (this.station !== null && this.otherStations.size > 0) {
            const canais = [...this.otherStations].map((i) => i + 1).join(", ");
            return (
                `${base}. A sessão calibra a base do canal ${this.station + 1}, mas o robô só enxergou o canal ${canais}: ` +
                `confira a visada da base do canal ${this.station + 1} ou recomece a sessão para usar outro canal.`
            );
        }

        return `${base}. Confira se ele está em Bootloader e se o fotodiodo enxerga a base station.`;
    }

    private clearPending(): void {
        if (this.pending?.timer) clearTimeout(this.pending.timer);
        this.pending = null;
    }
}

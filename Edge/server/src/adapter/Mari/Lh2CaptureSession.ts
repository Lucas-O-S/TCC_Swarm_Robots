import { LH2_CAPTURE_RETRIES, LH2_CAPTURE_TIMEOUT_MS } from "src/Constants/Lh2.Constants";
import { LH2_CORNER_ORDER, Lh2Corner } from "src/Enums/Lh2Corner.enum";
import { Lh2Sample } from "src/Protocols/Swarmit/Swarmit.Protocol";
import { Protocol } from "src/Protocols/Protocol";

// Captura LH2 de um robô, canto a canto - o `lh2-calibration collect` do
// PyDotBot 0.30.0 (dotbot/calibration/ota.py), dentro da borda. Sem Nest nem
// serial: quem manda o pedido é o `trigger` que o adapter passa, e quem
// entrega a resposta é o adapter chamando onSamples() quando chega o
// SWARMIT_EVENT_LOG. Assim dá para testar com timers falsos.
//
// Como no PyDotBot, só a estação de índice 0 (canal 1 da base) é calibrada.
// Amostras de outros índices ficam anotadas para explicar um timeout.

export const LH2_REFERENCE_STATION = 0;

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
    distanceMm: number;
    tag: string | null;
    captured: Partial<Record<Lh2Corner, Lh2Sample>>;
    missing: Lh2Corner[];
    // Canto esperando resposta do robô agora.
    pending: Lh2Corner | null;
    // Estações (índice = canal - 1) que responderam mas não são a de referência.
    otherStations: number[];
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

    constructor(
        address: string,
        readonly distanceMm: number,
        readonly tag: string | null,
        private readonly trigger: () => void,
        private readonly options: Lh2CaptureOptions = LH2_CAPTURE_DEFAULTS,
    ) {
        this.address = Protocol.normalizeAddress(address);
    }

    // Pede a captura e espera a amostra da estação de referência. O pedido
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

        const sample = samples.find((s) => s.lhIndex === LH2_REFERENCE_STATION);

        for (const s of samples)
            if (s.lhIndex !== LH2_REFERENCE_STATION) this.otherStations.add(s.lhIndex);

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

    view(): Lh2CaptureView {
        return {
            address: this.address,
            distanceMm: this.distanceMm,
            tag: this.tag,
            captured: Object.fromEntries(this.samples),
            missing: this.missing(),
            pending: this.pending?.corner ?? null,
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

        if (this.otherStations.size > 0) {
            const canais = [...this.otherStations].map((i) => i + 1).join(", ");
            return `${base}. O robô só enxerga a base no canal ${canais}: a calibração usa a do canal 1 - mude o canal da base.`;
        }

        return `${base}. Confira se ele está em Bootloader e se o fotodiodo enxerga a base station.`;
    }

    private clearPending(): void {
        if (this.pending?.timer) clearTimeout(this.pending.timer);
        this.pending = null;
    }
}

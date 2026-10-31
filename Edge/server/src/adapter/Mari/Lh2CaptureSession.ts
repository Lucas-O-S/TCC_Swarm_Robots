import { LH2_CAPTURE_MIN_RESPONSES, LH2_CAPTURE_RETRIES, LH2_CAPTURE_TIMEOUT_MS } from "src/Constants/Lh2.Constants";
import { LH2_CORNER_ORDER, Lh2Corner } from "src/Enums/Lh2Corner.enum";
import { Lh2Sample } from "src/Protocols/Swarmit/Swarmit.Protocol";
import { Protocol } from "src/Protocols/Protocol";

// Captura LH2 de um robô, canto a canto - o `lh2-calibration collect` do
// PyDotBot 0.30.0 (dotbot/calibration/ota.py), dentro da borda. Sem Nest nem
// serial: quem manda o pedido é o `trigger` que o adapter passa, e quem
// entrega a resposta é o adapter chamando onSamples() quando chega o
// SWARMIT_EVENT_LOG. Assim dá para testar com timers falsos.
//
// Calibra todas as bases que o robô enxergar, numa passada só (o PyDotBot
// 0.30.0 fixa a de índice 0). Cada resposta traz as bases com leitura pronta
// naquele instante (localization_get_raw_counts do swarmit 0.9.0), e o
// bootloader responde assim que a primeira fica pronta - então uma resposta
// pode vir sem alguma base. Por isso cada canto junta respostas: fecha com
// pelo menos minResponses e com todas as bases já vistas na sessão, pedindo
// de novo enquanto faltar alguma. Esgotados os pedidos, fecha com o que tem;
// a base que faltou fica apontada em view().bases e o solve recusa - no
// firmware 1.23.0 base visível sem calibração faz o robô perder a posição
// (localization_get_position usa a de menor índice sem olhar a calibração).

export interface Lh2CaptureOptions {
    timeoutMs: number;
    // Reenvios quando o robô não responde nada.
    retries: number;
    // Respostas que cada canto junta antes de fechar.
    minResponses: number;
}

export const LH2_CAPTURE_DEFAULTS: Lh2CaptureOptions = {
    timeoutMs: LH2_CAPTURE_TIMEOUT_MS,
    retries: LH2_CAPTURE_RETRIES,
    minResponses: LH2_CAPTURE_MIN_RESPONSES,
};

// Uma base vista na sessão e os cantos em que ela não apareceu.
export interface Lh2CaptureBase {
    channel: number;
    missing: Lh2Corner[];
}

export interface Lh2CaptureView {
    address: string;
    distanceMm: number;
    tag: string | null;
    // Leituras de cada canto, uma por base, em ordem de canal.
    captured: Partial<Record<Lh2Corner, Lh2Sample[]>>;
    // Cantos ainda não capturados.
    missing: Lh2Corner[];
    // Canto esperando resposta do robô agora.
    pending: Lh2Corner | null;
    // Bases vistas (canal = índice + 1). O solve exige missing vazio em todas.
    bases: Lh2CaptureBase[];
}

// Já tem um canto esperando resposta: um pedido por vez, senão a resposta de
// um canto cai no outro.
export class Lh2CaptureBusyError extends Error {}

// Nenhuma leitura depois de todos os reenvios.
export class Lh2CaptureTimeoutError extends Error {}

interface PendingCapture {
    corner: Lh2Corner;
    requests: number;
    responses: number;
    // Leitura mais recente de cada base neste canto (chave = índice).
    merged: Map<number, Lh2Sample>;
    timer: NodeJS.Timeout | null;
    resolve: (samples: Lh2Sample[]) => void;
    reject: (error: Error) => void;
}

export class Lh2CaptureSession {

    readonly address: string;

    private readonly samples = new Map<Lh2Corner, Lh2Sample[]>();

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

    // Pede a captura e devolve uma leitura por base vista no canto. O pedido
    // não tem ack no enlace: sem resposta no prazo, reenvia (retries vezes).
    // Capturar de novo um canto substitui as leituras anteriores.
    capture(corner: Lh2Corner): Promise<Lh2Sample[]> {
        if (this.pending)
            return Promise.reject(new Lh2CaptureBusyError(`captura do canto ${this.pending.corner} ainda em andamento`));

        return new Promise<Lh2Sample[]>((resolve, reject) => {
            this.pending = { corner, requests: 0, responses: 0, merged: new Map(), timer: null, resolve, reject };
            this.fire();
        });
    }

    // Leituras vindas de um EVENT_LOG. Devolve true se fecharam o canto pendente.
    onSamples(address: string, samples: Lh2Sample[]): boolean {
        const pending = this.pending;
        if (!pending || samples.length === 0 || Protocol.normalizeAddress(address) !== this.address) return false;

        pending.responses += 1;
        for (const sample of samples) pending.merged.set(sample.lhIndex, sample);

        // Recapturar um canto não exige as bases da leitura antiga dele: é assim
        // que uma base desligada sai da sessão.
        const expected = this.seenStations(pending.corner);
        const done = pending.responses >= this.options.minResponses && expected.every((station) => pending.merged.has(station));

        if (done || pending.requests >= this.maxRequests()) {
            this.close(pending);
            return true;
        }

        // Falta resposta ou base: pede de novo já, sem esperar o prazo.
        this.fire();
        return false;
    }

    cancel(reason = "captura cancelada"): void {
        const pending = this.pending;
        if (!pending) return;
        this.clearPending();
        pending.reject(new Error(reason));
    }

    // Por que ainda não dá para resolver (null = dá).
    problem(): string | null {
        const missing = this.missing();
        if (missing.length > 0) return `Faltam os cantos: ${missing.join(", ")}`;

        const incomplete = this.bases().filter((base) => base.missing.length > 0);
        if (incomplete.length === 0) return null;

        const detail = incomplete.map((base) => {
            const seen = LH2_CORNER_ORDER.filter((corner) => !base.missing.includes(corner));
            return (
                `a base do canal ${base.channel} não apareceu em ${base.missing.join(", ")}: recapture esses cantos ` +
                `com a visada dela livre, ou desligue a base e recapture ${seen.join(", ")}`
            );
        });

        return `${detail.join("; ")} (base ligada e sem calibração faz o robô perder a posição)`;
    }

    // Os 4 cantos de cada base (chave = índice), prontos para Lh2Homography.fromCorners.
    cornersByStation(): Map<number, Record<Lh2Corner, Lh2Sample>> {
        const problem = this.problem();
        if (problem) throw new Error(problem);

        const result = new Map<number, Record<Lh2Corner, Lh2Sample>>();

        for (const station of this.seenStations()) {
            const corners = Object.fromEntries(
                LH2_CORNER_ORDER.map((corner) => [corner, this.samples.get(corner)!.find((s) => s.lhIndex === station)!])
            ) as Record<Lh2Corner, Lh2Sample>;
            result.set(station, corners);
        }

        return result;
    }

    view(): Lh2CaptureView {
        return {
            address: this.address,
            distanceMm: this.distanceMm,
            tag: this.tag,
            captured: Object.fromEntries(this.samples),
            missing: this.missing(),
            pending: this.pending?.corner ?? null,
            bases: this.bases(),
        };
    }

    private missing(): Lh2Corner[] {
        return LH2_CORNER_ORDER.filter((corner) => !this.samples.has(corner));
    }

    private bases(): Lh2CaptureBase[] {
        return this.seenStations().map((station) => ({
            channel: station + 1,
            missing: LH2_CORNER_ORDER.filter((corner) => !this.samples.get(corner)?.some((s) => s.lhIndex === station)),
        }));
    }

    // Bases vistas nos cantos guardados e no canto em andamento. Sai das
    // contas assim que os cantos em que ela apareceu forem recapturados sem ela.
    private seenStations(ignoring?: Lh2Corner): number[] {
        const stations = new Set<number>();
        for (const [corner, samples] of this.samples)
            if (corner !== ignoring)
                for (const sample of samples) stations.add(sample.lhIndex);
        for (const station of this.pending?.merged.keys() ?? []) stations.add(station);
        return [...stations].sort((a, b) => a - b);
    }

    private maxRequests(): number {
        return this.options.minResponses + this.options.retries;
    }

    private fire(): void {
        const pending = this.pending;
        if (!pending) return;

        if (pending.timer) clearTimeout(pending.timer);

        pending.requests += 1;
        this.trigger();

        pending.timer = setTimeout(() => {
            if (this.pending !== pending) return;

            // Sem resposta nenhuma vale o limite de reenvios de sempre; com
            // alguma, o de pedidos por canto.
            const canRetry = pending.responses > 0
                ? pending.requests < this.maxRequests()
                : pending.requests <= this.options.retries;

            if (canRetry) {
                this.fire();
                return;
            }

            if (pending.merged.size > 0) {
                this.close(pending);
                return;
            }

            this.clearPending();
            pending.reject(new Lh2CaptureTimeoutError(
                `${this.address} não mandou a leitura do canto ${pending.corner} depois de ${pending.requests} tentativa(s). ` +
                `Confira se ele está em Bootloader e se o fotodiodo enxerga alguma base station.`
            ));
        }, this.options.timeoutMs);
    }

    private close(pending: PendingCapture): void {
        const samples = [...pending.merged.values()].sort((a, b) => a.lhIndex - b.lhIndex);
        this.clearPending();
        this.samples.set(pending.corner, samples);
        pending.resolve(samples);
    }

    private clearPending(): void {
        if (this.pending?.timer) clearTimeout(this.pending.timer);
        this.pending = null;
    }
}

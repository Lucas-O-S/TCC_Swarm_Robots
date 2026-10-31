import { Lh2CaptureBusyError, Lh2CaptureSession, Lh2CaptureTimeoutError } from "../adapter/Mari/Lh2CaptureSession";
import { Lh2Corner } from "../Enums/Lh2Corner.enum";
import { Lh2Sample } from "../Protocols/Swarmit/Swarmit.Protocol";

const A = "BDF2B04BC00D2725";
// Até minResponses + retries = 4 pedidos por canto quando há resposta.
const OPTIONS = { timeoutMs: 1000, retries: 2, minResponses: 2 };

const at = (lhIndex: number, count1 = 1): Lh2Sample => ({ lhIndex, count1, count2: 2 });

const session = () => {
    const trigger = jest.fn();
    return { trigger, s: new Lh2CaptureSession(A.toLowerCase(), 500, "arena", trigger, OPTIONS) };
};

// Fecha o canto respondendo a mesma leitura até ele fechar.
const captureWith = async (s: Lh2CaptureSession, corner: Lh2Corner, samples: Lh2Sample[]) => {
    const promise = s.capture(corner);
    while (!s.onSamples(A, samples)) { /* pede de novo até fechar */ }
    return promise;
};

describe("Lh2CaptureSession", () => {

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("junta minResponses respostas e pede a segunda na hora", async () => {
        const { trigger, s } = session();
        const promise = s.capture(Lh2Corner.TopLeft);

        expect(trigger).toHaveBeenCalledTimes(1);
        expect(s.view().pending).toBe(Lh2Corner.TopLeft);

        expect(s.onSamples(A, [at(0)])).toBe(false);
        expect(trigger).toHaveBeenCalledTimes(2);

        expect(s.onSamples(A, [at(0, 7)])).toBe(true);
        await expect(promise).resolves.toEqual([at(0, 7)]);

        expect(s.view()).toMatchObject({
            address: A,
            pending: null,
            missing: [Lh2Corner.TopRight, Lh2Corner.BottomLeft, Lh2Corner.BottomRight],
            bases: [{ channel: 1, missing: [Lh2Corner.TopRight, Lh2Corner.BottomLeft, Lh2Corner.BottomRight] }],
        });
    });

    it("base que faltou numa resposta entra pela outra: o canto sai com as duas, em ordem de canal", async () => {
        const { s } = session();
        const promise = s.capture(Lh2Corner.TopLeft);

        s.onSamples(A, [at(6)]);
        expect(s.onSamples(A, [at(0)])).toBe(true);

        await expect(promise).resolves.toEqual([at(0), at(6)]);
        expect(s.view().bases.map((b) => b.channel)).toEqual([1, 7]);
    });

    it("canto seguinte espera as bases já vistas", async () => {
        const { trigger, s } = session();
        await captureWith(s, Lh2Corner.TopLeft, [at(0), at(1)]);
        trigger.mockClear();

        const promise = s.capture(Lh2Corner.TopRight);
        expect(s.onSamples(A, [at(0)])).toBe(false);
        expect(s.onSamples(A, [at(0)])).toBe(false);
        expect(s.onSamples(A, [at(1)])).toBe(true);

        await expect(promise).resolves.toEqual([at(0), at(1)]);
        expect(trigger).toHaveBeenCalledTimes(3);
    });

    it("base que não aparece num canto: fecha com o que tem e o problem() diz qual e onde", async () => {
        const { trigger, s } = session();
        await captureWith(s, Lh2Corner.TopLeft, [at(0), at(1)]);
        trigger.mockClear();

        const promise = s.capture(Lh2Corner.TopRight);
        expect(s.onSamples(A, [at(0)])).toBe(false);
        expect(s.onSamples(A, [at(0)])).toBe(false);
        expect(s.onSamples(A, [at(0)])).toBe(false);
        expect(s.onSamples(A, [at(0)])).toBe(true);
        expect(trigger).toHaveBeenCalledTimes(4);
        await expect(promise).resolves.toEqual([at(0)]);

        await captureWith(s, Lh2Corner.BottomLeft, [at(0), at(1)]);
        await captureWith(s, Lh2Corner.BottomRight, [at(0), at(1)]);

        expect(s.view().bases).toEqual([
            { channel: 1, missing: [] },
            { channel: 2, missing: [Lh2Corner.TopRight] },
        ]);
        expect(s.problem()).toMatch(/base do canal 2 não apareceu em top-right/);
        expect(() => s.cornersByStation()).toThrow(/canal 2/);
    });

    it("desligar a base e recapturar os cantos em que ela apareceu tira ela da sessão", async () => {
        const { s } = session();
        await captureWith(s, Lh2Corner.TopLeft, [at(0), at(1)]);
        await captureWith(s, Lh2Corner.TopRight, [at(0)]);
        await captureWith(s, Lh2Corner.BottomLeft, [at(0)]);
        await captureWith(s, Lh2Corner.BottomRight, [at(0)]);
        expect(s.problem()).toMatch(/canal 2/);

        // Recaptura não espera a base da leitura antiga do próprio canto.
        const promise = s.capture(Lh2Corner.TopLeft);
        s.onSamples(A, [at(0, 9)]);
        expect(s.onSamples(A, [at(0, 9)])).toBe(true);
        await promise;

        expect(s.problem()).toBeNull();
        expect([...s.cornersByStation().keys()]).toEqual([0]);
        expect(s.cornersByStation().get(0)![Lh2Corner.TopLeft].count1).toBe(9);
    });

    it("reenvia sem resposta e desiste depois dos retries", async () => {
        const { trigger, s } = session();
        const promise = s.capture(Lh2Corner.TopRight);
        const outcome = expect(promise).rejects.toThrow(Lh2CaptureTimeoutError);

        jest.advanceTimersByTime(1000);
        jest.advanceTimersByTime(1000);
        expect(trigger).toHaveBeenCalledTimes(3);
        jest.advanceTimersByTime(1000);

        await outcome;
        expect(s.view().pending).toBeNull();
    });

    it("respondeu uma vez e calou: depois dos pedidos fecha com o que veio", async () => {
        const { trigger, s } = session();
        const promise = s.capture(Lh2Corner.TopLeft);

        s.onSamples(A, [at(0)]);
        jest.advanceTimersByTime(3000);

        await expect(promise).resolves.toEqual([at(0)]);
        expect(trigger).toHaveBeenCalledTimes(4);
    });

    it("ignora leitura de outro robô e recusa dois cantos ao mesmo tempo", async () => {
        const { s } = session();
        const first = s.capture(Lh2Corner.TopLeft);

        expect(s.onSamples("0000000000000002", [at(0)])).toBe(false);
        await expect(s.capture(Lh2Corner.TopRight)).rejects.toThrow(Lh2CaptureBusyError);

        s.cancel();
        await expect(first).rejects.toThrow("captura cancelada");
    });

    it("cornersByStation() exige os 4 cantos e recapturar substitui", async () => {
        const { s } = session();
        expect(s.problem()).toMatch(/Faltam os cantos/);
        expect(() => s.cornersByStation()).toThrow(/Faltam/);

        let n = 0;
        for (const corner of [Lh2Corner.TopLeft, Lh2Corner.TopRight, Lh2Corner.BottomLeft, Lh2Corner.BottomRight, Lh2Corner.TopLeft])
            await captureWith(s, corner, [at(0, ++n), at(2, n)]);

        expect(s.problem()).toBeNull();
        const corners = s.cornersByStation();
        expect([...corners.keys()]).toEqual([0, 2]);
        expect(corners.get(0)![Lh2Corner.TopLeft].count1).toBe(5);
        expect(corners.get(2)![Lh2Corner.BottomRight]).toEqual(at(2, 4));
    });
});

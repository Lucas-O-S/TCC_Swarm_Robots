import { Lh2CaptureBusyError, Lh2CaptureSession, Lh2CaptureTimeoutError } from "../adapter/Mari/Lh2CaptureSession";
import { Lh2Corner } from "../Enums/Lh2Corner.enum";

const A = "BDF2B04BC00D2725";
const OPTIONS = { timeoutMs: 1000, retries: 2 };

const session = () => {
    const trigger = jest.fn();
    return { trigger, s: new Lh2CaptureSession(A.toLowerCase(), 500, "arena", trigger, OPTIONS) };
};

describe("Lh2CaptureSession", () => {

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("pede a captura e fecha o canto com a amostra da estação 0", async () => {
        const { trigger, s } = session();
        const promise = s.capture(Lh2Corner.TopLeft);

        expect(trigger).toHaveBeenCalledTimes(1);
        expect(s.view().pending).toBe(Lh2Corner.TopLeft);

        expect(s.onSamples(A, [{ lhIndex: 0, count1: 1, count2: 2 }])).toBe(true);
        await expect(promise).resolves.toEqual({ lhIndex: 0, count1: 1, count2: 2 });

        expect(s.view()).toMatchObject({ address: A, pending: null, missing: [Lh2Corner.TopRight, Lh2Corner.BottomLeft, Lh2Corner.BottomRight] });
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

    it("base em outro canal: o timeout diz qual", async () => {
        const { s } = session();
        const promise = s.capture(Lh2Corner.TopLeft);
        const outcome = expect(promise).rejects.toThrow(/canal 3/);

        expect(s.onSamples(A, [{ lhIndex: 2, count1: 1, count2: 2 }])).toBe(false);
        jest.advanceTimersByTime(3000);

        await outcome;
        expect(s.view().otherStations).toEqual([2]);
    });

    it("ignora amostra de outro robô e recusa dois cantos ao mesmo tempo", async () => {
        const { s } = session();
        const first = s.capture(Lh2Corner.TopLeft);

        expect(s.onSamples("0000000000000002", [{ lhIndex: 0, count1: 1, count2: 2 }])).toBe(false);
        await expect(s.capture(Lh2Corner.TopRight)).rejects.toThrow(Lh2CaptureBusyError);

        s.cancel();
        await expect(first).rejects.toThrow("captura cancelada");
    });

    it("corners() exige os 4 e recapturar substitui", async () => {
        const { s } = session();
        expect(() => s.corners()).toThrow(/faltam/);

        let n = 0;
        for (const corner of [Lh2Corner.TopLeft, Lh2Corner.TopRight, Lh2Corner.BottomLeft, Lh2Corner.BottomRight, Lh2Corner.TopLeft]) {
            const p = s.capture(corner);
            s.onSamples(A, [{ lhIndex: 0, count1: ++n, count2: 0 }]);
            await p;
        }

        expect(s.isComplete()).toBe(true);
        expect(s.corners()[Lh2Corner.TopLeft].count1).toBe(5);
    });
});

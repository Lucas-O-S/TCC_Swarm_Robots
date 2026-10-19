import { Lh2Homography } from "../Protocols/Swarmit/Lh2Homography";
import { Lh2Sample } from "../Protocols/Swarmit/Swarmit.Protocol";
import { Lh2Corner } from "../Enums/Lh2Corner.enum";

// Vetores gerados com o próprio PyDotBot 0.30.0 (camera_points_from_counts +
// compute_homography_matrix com cv2 + homography_as_bytes) para as mesmas
// contagens. O cv2 refina a solução por mínimos quadrados e nós resolvemos o
// sistema exato: os coeficientes diferem lá pela 5ª casa, o que pode mudar o
// truncamento em 1 unidade (0,001). Por isso a comparação é por int32 ±1.
const corners = (c: [number, number][]): Record<Lh2Corner, Lh2Sample> => ({
    [Lh2Corner.TopLeft]: { lhIndex: 0, count1: c[0][0], count2: c[0][1] },
    [Lh2Corner.TopRight]: { lhIndex: 0, count1: c[1][0], count2: c[1][1] },
    [Lh2Corner.BottomLeft]: { lhIndex: 0, count1: c[2][0], count2: c[2][1] },
    [Lh2Corner.BottomRight]: { lhIndex: 0, count1: c[3][0], count2: c[3][1] },
});

const CASES = [
    {
        name: "quadrado de 500 mm",
        distance: 500,
        counts: [[31000, 69000], [52000, 88000], [28000, 61000], [47000, 79000]] as [number, number][],
        camera0: [0.5737160938948662, 0.0888541719791759],
        wire: "0a6cfdff72b00200e81411000e690400b5be150010610b008c00000025feffffe8030000",
    },
    {
        name: "quadrado de 400 mm",
        distance: 400,
        counts: [[40210, 74550], [58830, 90120], [36990, 66010], [54470, 81330]] as [number, number][],
        camera0: [0.13485876907988942, 0.2541083885436595],
        wire: "8747fcfffee7fcffe4620b00f7a90100e55f06000f410800f4ffffff60fdffffe8030000",
    },
];

describe("Lh2Homography", () => {

    it.each(CASES)("ponto de câmera igual ao do PyDotBot ($name)", ({ counts, camera0 }) => {
        const [x, y] = Lh2Homography.cameraPoint({ lhIndex: 0, count1: counts[0][0], count2: counts[0][1] });
        expect(x).toBeCloseTo(camera0[0], 12);
        expect(y).toBeCloseTo(camera0[1], 12);
    });

    it.each(CASES)("matriz no fio igual à do PyDotBot ($name)", ({ counts, distance, wire }) => {
        const ours = Lh2Homography.toWire(Lh2Homography.fromCorners(corners(counts), distance));
        const ref = Buffer.from(wire, "hex");

        expect(ours.length).toBe(36);
        for (let i = 0; i < 9; i++) {
            expect(Math.abs(ours.readInt32LE(i * 4) - ref.readInt32LE(i * 4))).toBeLessThanOrEqual(1);
        }
        // h33 = 1 sai exato: 1000.
        expect(ours.readInt32LE(32)).toBe(1000);
    });

    it("cantos em mm: arena de 5 × o lado", () => {
        expect(Lh2Homography.referencePoint(Lh2Corner.TopLeft, 500)).toEqual([1000, 1000]);
        expect(Lh2Homography.referencePoint(Lh2Corner.BottomRight, 500)).toEqual([1500, 1500]);
    });

    it("cada canto capturado cai na sua referência", () => {
        const c = corners(CASES[0].counts);
        const h = Lh2Homography.fromCorners(c, 500);
        const [x, y] = Lh2Homography.apply(h, Lh2Homography.cameraPoint(c[Lh2Corner.TopRight]));
        expect(x).toBeCloseTo(1500, 6);
        expect(y).toBeCloseTo(1000, 6);
    });

    it("recusa canto repetido (robô não saiu do lugar)", () => {
        const same: [number, number] = [31000, 69000];
        expect(() => Lh2Homography.fromCorners(corners([same, same, [28000, 61000], [47000, 79000]]), 500)).toThrow(/degenerados/);
    });

    it("recusa estação fora da tabela de canais", () => {
        expect(() => Lh2Homography.cameraPoint({ lhIndex: 16, count1: 1, count2: 2 })).toThrow(/períodos/);
    });
});

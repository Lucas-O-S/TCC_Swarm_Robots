import { Lh2Homography } from "../Protocols/Swarmit/Lh2Homography";
import { Lh2Sample } from "../Protocols/Swarmit/Swarmit.Protocol";
import { Lh2Corner } from "../Enums/Lh2Corner.enum";
import { Lh2Layout } from "../Protocols/Swarmit/Lh2Layout";

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
        const ours = Lh2Homography.toWire(Lh2Homography.fromCorners(corners(counts), Lh2Layout.legacy(distance)));
        const ref = Buffer.from(wire, "hex");

        expect(ours.length).toBe(36);
        for (let i = 0; i < 9; i++) {
            expect(Math.abs(ours.readInt32LE(i * 4) - ref.readInt32LE(i * 4))).toBeLessThanOrEqual(1);
        }
        // h33 = 1 sai exato: 1000.
        expect(ours.readInt32LE(32)).toBe(1000);
    });

    it("cantos em mm: arena de 5 × o lado (layout do PyDotBot)", () => {
        expect(Lh2Homography.referencePoint(Lh2Corner.TopLeft, Lh2Layout.legacy(500))).toEqual([1000, 1000]);
        expect(Lh2Homography.referencePoint(Lh2Corner.BottomRight, Lh2Layout.legacy(500))).toEqual([1500, 1500]);
    });

    it("cada canto capturado cai na sua referência", () => {
        const c = corners(CASES[0].counts);
        const h = Lh2Homography.fromCorners(c, Lh2Layout.legacy(500));
        const [x, y] = Lh2Homography.apply(h, Lh2Homography.cameraPoint(c[Lh2Corner.TopRight]));
        expect(x).toBeCloseTo(1500, 6);
        expect(y).toBeCloseTo(1000, 6);
    });

    it("recusa canto repetido (robô não saiu do lugar)", () => {
        const same: [number, number] = [31000, 69000];
        expect(() => Lh2Homography.fromCorners(corners([same, same, [28000, 61000], [47000, 79000]]), Lh2Layout.legacy(500))).toThrow(/degenerados/);
    });

    it("na área real: os cantos caem em margem + posição do quadrado", () => {
        const layout = Lh2Layout.inArea(800, 800, { areaWidthMm: 1200, areaHeightMm: 1200, rectXMm: 200, rectYMm: 100 });
        const c = corners(CASES[0].counts);
        const h = Lh2Homography.fromCorners(c, layout);

        // Margem fixa de 1000 mm: o canto da área é (1000, 1000).
        expect(layout.area).toEqual({ x: 1000, y: 1000, width: 1200, height: 1200 });
        const expected: Record<Lh2Corner, [number, number]> = {
            [Lh2Corner.TopLeft]: [1200, 1100], [Lh2Corner.TopRight]: [2000, 1100],
            [Lh2Corner.BottomLeft]: [1200, 1900], [Lh2Corner.BottomRight]: [2000, 1900],
        };
        for (const corner of Object.values(Lh2Corner)) {
            const [x, y] = Lh2Homography.apply(h, Lh2Homography.cameraPoint(c[corner]));
            expect(x).toBeCloseTo(expected[corner][0], 6);
            expect(y).toBeCloseTo(expected[corner][1], 6);
        }
    });

    it("retângulo: largura e altura diferentes, cantos em (x, y) .. (x + largura, y + altura)", () => {
        const layout = Lh2Layout.inArea(1000, 800, { areaWidthMm: 1200, areaHeightMm: 1000, rectXMm: 100, rectYMm: 100 });
        expect([Lh2Corner.TopLeft, Lh2Corner.TopRight, Lh2Corner.BottomLeft, Lh2Corner.BottomRight].map((c) => layout.corner(c)))
            .toEqual([[1100, 1100], [2100, 1100], [1100, 1900], [2100, 1900]]);

        // No layout do PyDotBot o retângulo fica de 40% a 60% de 5 × o tamanho em cada eixo.
        expect(Lh2Layout.legacy(1000, 800).corner(Lh2Corner.BottomRight)).toEqual([3000, 2400]);

        const c = corners(CASES[0].counts);
        const [x, y] = Lh2Homography.apply(Lh2Homography.fromCorners(c, layout), Lh2Homography.cameraPoint(c[Lh2Corner.BottomRight]));
        expect(x).toBeCloseTo(2100, 6);
        expect(y).toBeCloseTo(1900, 6);
    });

    it("recusa retângulo que passa da área", () => {
        expect(() => Lh2Layout.inArea(800, 800, { areaWidthMm: 1200, areaHeightMm: 1200, rectXMm: 500, rectYMm: 0 })).toThrow(/passa da área/);
        expect(() => Lh2Layout.inArea(1000, 800, { areaWidthMm: 1200, areaHeightMm: 1000, rectXMm: 0, rectYMm: 300 })).toThrow(/passa da área/);
        expect(() => Lh2Layout.inArea(800, 800, { areaWidthMm: 1200, areaHeightMm: 1200, rectXMm: -1, rectYMm: 0 })).toThrow(/negativa/);
    });

    it("correção de medida = resolver de novo com a medida certa (lado, largura e altura, posição)", () => {
        const c = corners(CASES[0].counts);
        // Digitou um quadrado de 500 no layout do PyDotBot; era um retângulo de 800 × 600 numa área.
        const typed = Lh2Layout.legacy(500);
        const right = Lh2Layout.inArea(800, 600, { areaWidthMm: 1200, areaHeightMm: 1000, rectXMm: 300, rectYMm: 200 });

        const corrected = Lh2Homography.reframe(Lh2Homography.fromCorners(c, typed), typed, right);
        const solved = Lh2Homography.fromCorners(c, right);

        // Qualquer ponto (não só os cantos) vai para o mesmo lugar.
        for (const counts of [[31000, 69000], [40000, 75000], [50000, 85000]] as [number, number][]) {
            const p = Lh2Homography.cameraPoint({ lhIndex: 0, count1: counts[0], count2: counts[1] });
            const [ax, ay] = Lh2Homography.apply(corrected, p);
            const [bx, by] = Lh2Homography.apply(solved, p);
            expect(ax).toBeCloseTo(bx, 6);
            expect(ay).toBeCloseTo(by, 6);
        }
    });

    it("correção no fio é exata para deslocamento em mm inteiros", () => {
        const legacy = Lh2Layout.legacy(800);
        const area = Lh2Layout.inArea(800, 800, { areaWidthMm: 1200, areaHeightMm: 1200, rectXMm: 200, rectYMm: 200 });
        // Matriz da calibração real de 27/11 (lado 800, canal 13).
        const wire = Lh2Homography.toWire([1639.62, 3983.394, 1968.438, -745.293, 7402.737, 1605.531, -0.179, 1.867, 1]);
        const out = Lh2Homography.reframeWire(wire, legacy, area);

        // Translação (1200 - 1600) = -400 mm nos dois eixos: linha 1 += -400 × linha 3, idem a 2.
        const ints = (b: Buffer) => Array.from({ length: 9 }, (_, i) => b.readInt32LE(i * 4));
        const w = ints(wire);
        expect(ints(out)).toEqual([
            w[0] - 400 * w[6], w[1] - 400 * w[7], w[2] - 400 * w[8],
            w[3] - 400 * w[6], w[4] - 400 * w[7], w[5] - 400 * w[8],
            w[6], w[7], w[8],
        ]);
    });

    it("recusa estação fora da tabela de canais", () => {
        expect(() => Lh2Homography.cameraPoint({ lhIndex: 16, count1: 1, count2: 2 })).toThrow(/períodos/);
    });
});

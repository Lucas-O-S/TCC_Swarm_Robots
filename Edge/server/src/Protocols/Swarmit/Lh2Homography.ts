import { LH2_HOMOGRAPHY_TOLERANCE, LH2_MATRIX_LEN, LH2_PERIODS } from "src/Constants/Lh2.Constants";
import { LH2_CORNER_ORDER, Lh2Corner } from "src/Enums/Lh2Corner.enum";
import { Lh2Sample } from "./Swarmit.Protocol";
import type { Lh2Layout } from "./Lh2Layout";

// Matemática da calibração LH2, igual à do PyDotBot 0.30.0
// (dotbot/calibration/lighthouse2.py), sem OpenCV: com exatamente 4 cantos a
// homografia é a solução de um sistema linear 8 × 8, que é o que o
// cv2.findHomography devolve nesse caso.

export type Point = [number, number];

// Matriz 3 × 3 em row-major, com H[2][2] = 1.
export type Homography = number[];

export class Lh2Homography {

    // Contagens -> ponto no "plano da câmera" da base (calculate_camera_point).
    static cameraPoint(sample: Lh2Sample): Point {
        const period = LH2_PERIODS[sample.lhIndex];

        if (period === undefined)
            throw new Error(`estação ${sample.lhIndex} fora da tabela de períodos`);

        const a1 = (sample.count1 * 8 / period) * 2 * Math.PI;
        const a2 = (sample.count2 * 8 / period) * 2 * Math.PI;

        const x = -Math.tan(0.5 * (a1 + a2));
        const y = sample.count1 < sample.count2
            ? -Math.sin(a2 / 2 - a1 / 2 - 60 * Math.PI / 180) / Math.tan(Math.PI / 6)
            : -Math.sin(a1 / 2 - a2 / 2 - 60 * Math.PI / 180) / Math.tan(Math.PI / 6);

        return [x, y];
    }

    // Posição (mm) que cada canto deve ter no referencial (ver Lh2Layout).
    static referencePoint(corner: Lh2Corner, layout: Lh2Layout): Point {
        return layout.corner(corner);
    }

    // Homografia que leva cada src[i] em dst[i] (4 pares, DLT com h33 = 1).
    static solve(src: Point[], dst: Point[]): Homography {
        if (src.length !== 4 || dst.length !== 4)
            throw new Error("a homografia precisa de exatamente 4 pares de pontos");

        // Para cada par: duas linhas de A·h = b, com h = [h11..h32].
        const rows: number[][] = [];
        for (let i = 0; i < 4; i++) {
            const [x, y] = src[i];
            const [u, v] = dst[i];
            rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
            rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
        }

        const h = Lh2Homography.gauss(rows);
        return [...h, 1];
    }

    static apply(h: Homography, [x, y]: Point): Point {
        const w = h[6] * x + h[7] * y + h[8];
        return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
    }

    // Inverso do toWire: 9 × int32 LE / 1000.
    static fromWire(wire: Buffer): Homography {
        if (wire.length !== LH2_MATRIX_LEN)
            throw new Error(`matriz com ${wire.length} B, esperava ${LH2_MATRIX_LEN} B`);
        return Array.from({ length: 9 }, (_, i) => wire.readInt32LE(i * 4) / 1000);
    }

    // Mesma captura num referencial novo, sem voltar ao chão. De um layout
    // para outro os cantos só mudam por escala (lado novo / lado antigo) e
    // translação - nada gira -, então H' = A · H, com
    // A = [[s, 0, tx], [0, s, ty], [0, 0, 1]]. A terceira linha de H não muda
    // (h33 continua 1) e, com escala 1 e deslocamento em mm inteiros, os
    // coeficientes novos continuam múltiplos de 0,001: o toWire não perde nada.
    static reframe(h: Homography, from: Lh2Layout, to: Lh2Layout): Homography {
        const s = to.distanceMm / from.distanceMm;
        const tx = to.squareX - s * from.squareX;
        const ty = to.squareY - s * from.squareY;

        return [
            s * h[0] + tx * h[6], s * h[1] + tx * h[7], s * h[2] + tx * h[8],
            s * h[3] + ty * h[6], s * h[4] + ty * h[7], s * h[5] + ty * h[8],
            h[6], h[7], h[8],
        ];
    }

    // Formato do fio: 9 × int32 LE, valor × 1000 truncado para zero (o
    // int(n * 1e3) do homography_as_bytes).
    static toWire(h: Homography): Buffer {
        return Lh2Homography.pack(h, Math.trunc);
    }

    // reframe direto no formato do fio. Arredonda em vez de truncar: os
    // coeficientes novos já são múltiplos de 0,001 e só o ponto flutuante os
    // tira do lugar (1460,62 vira 1460,6199999...), e o trunc perderia 0,001.
    static reframeWire(wire: Buffer, from: Lh2Layout, to: Lh2Layout): Buffer {
        return Lh2Homography.pack(Lh2Homography.reframe(Lh2Homography.fromWire(wire), from, to), Math.round);
    }

    private static pack(h: Homography, toInt: (n: number) => number): Buffer {
        const out = Buffer.alloc(LH2_MATRIX_LEN);
        h.forEach((value, i) => {
            const scaled = toInt(value * 1000);
            // O PyDotBot cai para 36 zeros quando estoura; aqui falha alto -
            // a matriz zerada "calibraria" o robô com lixo.
            if (!Number.isFinite(scaled) || scaled > 0x7FFFFFFF || scaled < -0x80000000)
                throw new Error(`coeficiente ${i} da homografia fora do int32 (${value})`);
            out.writeInt32LE(scaled, i * 4);
        });
        return out;
    }

    // Calibração da estação de referência a partir dos 4 cantos
    // (_compute_reference_homography). Confere que os cantos projetados caem
    // nos de referência antes de devolver.
    static fromCorners(samples: Record<Lh2Corner, Lh2Sample>, layout: Lh2Layout): Homography {
        const src = LH2_CORNER_ORDER.map((corner) => Lh2Homography.cameraPoint(samples[corner]));
        const dst = LH2_CORNER_ORDER.map((corner) => Lh2Homography.referencePoint(corner, layout));

        const h = Lh2Homography.solve(src, dst);

        src.forEach((point, i) => {
            const [px, py] = Lh2Homography.apply(h, point);
            const [rx, ry] = dst[i];
            if (Math.abs(px - rx) > LH2_HOMOGRAPHY_TOLERANCE || Math.abs(py - ry) > LH2_HOMOGRAPHY_TOLERANCE)
                throw new Error(
                    `canto ${LH2_CORNER_ORDER[i]} projetado em (${px.toFixed(3)}, ${py.toFixed(3)}), ` +
                    `esperava (${rx}, ${ry}) - capturas inconsistentes (cantos repetidos ou alinhados?)`
                );
        });

        return h;
    }

    // Eliminação de Gauss com pivotamento parcial; última coluna = b.
    private static gauss(rows: number[][]): number[] {
        const n = rows.length;
        const m = rows.map((r) => [...r]);

        for (let col = 0; col < n; col++) {
            let pivot = col;
            for (let r = col + 1; r < n; r++)
                if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;

            if (Math.abs(m[pivot][col]) < 1e-12)
                throw new Error("cantos degenerados (repetidos ou alinhados): a homografia não tem solução");

            [m[col], m[pivot]] = [m[pivot], m[col]];

            for (let r = 0; r < n; r++) {
                if (r === col) continue;
                const f = m[r][col] / m[col][col];
                for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c];
            }
        }

        return m.map((row, i) => row[n] / row[i]);
    }
}

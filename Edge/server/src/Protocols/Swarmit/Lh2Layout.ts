import { LH2_AREA_MARGIN_MM, LH2_ARENA_FACTOR } from "src/Constants/Lh2.Constants";
import { LH2_CORNER_REFERENCE, Lh2Corner } from "src/Enums/Lh2Corner.enum";
import type { Point } from "./Lh2Homography";
import type { Lh2CalibrationMeta } from "./Lh2Calibration";

// Retângulo no referencial da LH2 (mm; x,y = canto superior-esquerdo).
export interface Lh2Area {
    x: number;
    y: number;
    width: number;
    height: number;
}

// O que se mede no chão: o tamanho da área real e onde o canto TopLeft do
// quadrado de calibração fica em relação ao canto superior-esquerdo dela.
export interface Lh2AreaPlacement {
    areaWidthMm: number;
    areaHeightMm: number;
    squareXMm: number;
    squareYMm: number;
}

// Onde ficam o quadrado de calibração e a área real no referencial da LH2
// (mm, X pra direita, Y pra baixo, origem no canto superior-esquerdo - o do
// firmware). É o que decide para onde a homografia leva cada canto, e
// portanto em que números o robô vai reportar a posição.
//
// Dois jeitos:
// - legado (PyDotBot 0.30.0): só o lado; o quadrado fica de 40% a 60% de uma
//   arena de 5 × o lado, então o (0,0) é um ponto virtual a 2 lados do canto
//   TopLeft. area = null.
// - na área: o (0,0) fica LH2_AREA_MARGIN_MM antes do canto da área real e o
//   quadrado onde ele foi colado nela. O canto da área sai sempre no mesmo
//   número, qualquer que seja o quadrado.
export class Lh2Layout {

    private constructor(
        readonly distanceMm: number,
        // Canto TopLeft do quadrado no referencial.
        readonly squareX: number,
        readonly squareY: number,
        readonly area: Lh2Area | null,
    ) {}

    static legacy(distanceMm: number): Lh2Layout {
        const [fx, fy] = LH2_CORNER_REFERENCE[Lh2Corner.TopLeft];
        const scale = distanceMm * LH2_ARENA_FACTOR;
        return new Lh2Layout(distanceMm, fx * scale, fy * scale, null);
    }

    // Recusa quadrado que não cabe na área: os cantos precisam estar dentro
    // dela para a calibração valer onde o robô anda.
    static inArea(distanceMm: number, placement: Lh2AreaPlacement, marginMm: number = LH2_AREA_MARGIN_MM): Lh2Layout {
        const { areaWidthMm, areaHeightMm, squareXMm, squareYMm } = placement;

        if (areaWidthMm <= 0 || areaHeightMm <= 0)
            throw new Error("a área precisa ter largura e altura maiores que zero");

        if (squareXMm < 0 || squareYMm < 0)
            throw new Error("a posição do quadrado é medida a partir do canto superior-esquerdo da área e não pode ser negativa");

        if (squareXMm + distanceMm > areaWidthMm || squareYMm + distanceMm > areaHeightMm)
            throw new Error(
                `o quadrado de ${distanceMm} mm em (${squareXMm}, ${squareYMm}) passa da área de ${areaWidthMm} × ${areaHeightMm} mm`
            );

        return new Lh2Layout(
            distanceMm,
            marginMm + squareXMm,
            marginMm + squareYMm,
            { x: marginMm, y: marginMm, width: areaWidthMm, height: areaHeightMm },
        );
    }

    // Layout já resolvido (lido do [metadata] de um TOML).
    static of(distanceMm: number, squareX: number, squareY: number, area: Lh2Area | null): Lh2Layout {
        return area === null ? Lh2Layout.legacy(distanceMm) : new Lh2Layout(distanceMm, squareX, squareY, area);
    }

    // Campos do [metadata] que guardam este layout (nenhum no legado).
    metaFields(): Pick<Lh2CalibrationMeta, "squareX" | "squareY" | "area"> {
        return this.area === null ? {} : { squareX: this.squareX, squareY: this.squareY, area: { ...this.area } };
    }

    // Posição (mm) que cada canto do quadrado deve ter. No legado a conta é a
    // mesma do PyDotBot (fração × 5 × lado), para a matriz sair igual à dele.
    corner(corner: Lh2Corner): Point {
        if (this.area === null) {
            const [fx, fy] = LH2_CORNER_REFERENCE[corner];
            const scale = this.distanceMm * LH2_ARENA_FACTOR;
            return [fx * scale, fy * scale];
        }

        const right = corner === Lh2Corner.TopRight || corner === Lh2Corner.BottomRight;
        const down = corner === Lh2Corner.BottomLeft || corner === Lh2Corner.BottomRight;
        return [this.squareX + (right ? this.distanceMm : 0), this.squareY + (down ? this.distanceMm : 0)];
    }
}

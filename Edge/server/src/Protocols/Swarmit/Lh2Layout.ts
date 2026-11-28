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

// O que se mede no chão: o tamanho da área real e onde o canto top-left do
// retângulo de calibração fica em relação ao canto superior-esquerdo dela.
export interface Lh2AreaPlacement {
    areaWidthMm: number;
    areaHeightMm: number;
    rectXMm: number;
    rectYMm: number;
}

// Onde ficam o retângulo de calibração (as 4 marcas no chão; quadrado =
// largura igual à altura) e a área real no referencial da LH2 (mm, X pra
// direita, Y pra baixo, origem no canto superior-esquerdo - o do firmware).
// É o que decide para onde a homografia leva cada canto, e portanto em que
// números o robô vai reportar a posição. A conta de 4 pontos não exige
// quadrado: qualquer retângulo serve, e um grande (perto do tamanho da área)
// erra menos longe das marcas.
//
// Dois jeitos:
// - legado (PyDotBot 0.30.0): o retângulo fica de 40% a 60% de uma arena de
//   5 × o seu tamanho, então o (0,0) é um ponto virtual a 2 larguras/alturas
//   do canto top-left. area = null.
// - na área: o (0,0) fica LH2_AREA_MARGIN_MM antes do canto da área real e o
//   retângulo onde ele foi marcado nela. O canto da área sai sempre no mesmo
//   número, qualquer que seja o retângulo.
export class Lh2Layout {

    private constructor(
        readonly widthMm: number,
        readonly heightMm: number,
        // Canto top-left do retângulo no referencial.
        readonly rectX: number,
        readonly rectY: number,
        readonly area: Lh2Area | null,
    ) {}

    get isSquare(): boolean {
        return this.widthMm === this.heightMm;
    }

    // Para quadrado, a conta é a mesma do PyDotBot (fração × 5 × lado), para a
    // matriz sair igual à dele.
    static legacy(widthMm: number, heightMm: number = widthMm): Lh2Layout {
        const [fx, fy] = LH2_CORNER_REFERENCE[Lh2Corner.TopLeft];
        // fração × (lado × 5), na ordem do PyDotBot (reference_points *= d * 5).
        return new Lh2Layout(widthMm, heightMm, fx * (widthMm * LH2_ARENA_FACTOR), fy * (heightMm * LH2_ARENA_FACTOR), null);
    }

    // Recusa retângulo que não cabe na área: os cantos precisam estar dentro
    // dela para a calibração valer onde o robô anda.
    static inArea(widthMm: number, heightMm: number, placement: Lh2AreaPlacement, marginMm: number = LH2_AREA_MARGIN_MM): Lh2Layout {
        const { areaWidthMm, areaHeightMm, rectXMm, rectYMm } = placement;

        if (areaWidthMm <= 0 || areaHeightMm <= 0)
            throw new Error("a área precisa ter largura e altura maiores que zero");

        if (rectXMm < 0 || rectYMm < 0)
            throw new Error("a posição do retângulo é medida a partir do canto superior-esquerdo da área e não pode ser negativa");

        if (rectXMm + widthMm > areaWidthMm || rectYMm + heightMm > areaHeightMm)
            throw new Error(
                `o retângulo de ${widthMm} × ${heightMm} mm em (${rectXMm}, ${rectYMm}) passa da área de ${areaWidthMm} × ${areaHeightMm} mm`
            );

        return new Lh2Layout(
            widthMm,
            heightMm,
            marginMm + rectXMm,
            marginMm + rectYMm,
            { x: marginMm, y: marginMm, width: areaWidthMm, height: areaHeightMm },
        );
    }

    // Layout já resolvido (lido do [metadata] de um TOML).
    static of(widthMm: number, heightMm: number, rectX: number, rectY: number, area: Lh2Area | null): Lh2Layout {
        return area === null ? Lh2Layout.legacy(widthMm, heightMm) : new Lh2Layout(widthMm, heightMm, rectX, rectY, area);
    }

    // O que se mediu no chão para chegar neste layout (null no legado).
    placement(): Lh2AreaPlacement | null {
        const area = this.area;
        return area === null
            ? null
            : { areaWidthMm: area.width, areaHeightMm: area.height, rectXMm: this.rectX - area.x, rectYMm: this.rectY - area.y };
    }

    equals(other: Lh2Layout): boolean {
        const a = this.area, b = other.area;
        const sameArea = a === null || b === null
            ? a === b
            : a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
        return sameArea && this.widthMm === other.widthMm && this.heightMm === other.heightMm
            && this.rectX === other.rectX && this.rectY === other.rectY;
    }

    // Campos do [metadata] que guardam este layout. O calibration_distance_mm
    // do PyDotBot é um lado só: no retângulo ele leva a largura e o tamanho
    // de verdade vai em widthMm/heightMm.
    metaFields(): Pick<Lh2CalibrationMeta, "distanceMm" | "widthMm" | "heightMm" | "rectX" | "rectY" | "area"> {
        const size = this.isSquare ? {} : { widthMm: this.widthMm, heightMm: this.heightMm };
        const where = this.area === null ? {} : { rectX: this.rectX, rectY: this.rectY, area: { ...this.area } };
        return { distanceMm: this.widthMm, ...size, ...where };
    }

    // Posição (mm) que cada canto do retângulo deve ter.
    corner(corner: Lh2Corner): Point {
        if (this.area === null) {
            const [fx, fy] = LH2_CORNER_REFERENCE[corner];
            return [fx * (this.widthMm * LH2_ARENA_FACTOR), fy * (this.heightMm * LH2_ARENA_FACTOR)];
        }

        const right = corner === Lh2Corner.TopRight || corner === Lh2Corner.BottomRight;
        const down = corner === Lh2Corner.BottomLeft || corner === Lh2Corner.BottomRight;
        return [this.rectX + (right ? this.widthMm : 0), this.rectY + (down ? this.heightMm : 0)];
    }
}

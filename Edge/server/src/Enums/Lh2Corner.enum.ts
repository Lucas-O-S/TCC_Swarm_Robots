// Cantos do quadrado de calibração. A ORDEM é a do PyDotBot 0.30.0 (CORNERS em
// dotbot/calibration/ota.py) e não é cosmética: cada canto casa com um ponto
// de referência por posição, e trocar dois espelha ou torce a arena.
export enum Lh2Corner {
    TopLeft = "top-left",
    TopRight = "top-right",
    BottomLeft = "bottom-left",
    BottomRight = "bottom-right",
}

export const LH2_CORNER_ORDER: Lh2Corner[] = [
    Lh2Corner.TopLeft,
    Lh2Corner.TopRight,
    Lh2Corner.BottomLeft,
    Lh2Corner.BottomRight,
];

// Posição de cada canto como fração da arena (REFERENCE_POINTS_DEFAULT).
export const LH2_CORNER_REFERENCE: Record<Lh2Corner, [number, number]> = {
    [Lh2Corner.TopLeft]: [0.4, 0.4],
    [Lh2Corner.TopRight]: [0.6, 0.4],
    [Lh2Corner.BottomLeft]: [0.4, 0.6],
    [Lh2Corner.BottomRight]: [0.6, 0.6],
};

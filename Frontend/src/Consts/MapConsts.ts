export const DEFAULT_COLS = 16;
export const DEFAULT_ROWS = 16;
export const DEFAULT_CELL = 32;

// Escala real representada por cada bloco (célula) do grid.
export const BLOCK_AREA_CM2 = 0.04;
export const BLOCK_SIDE_M = Math.sqrt(BLOCK_AREA_CM2);

export const DEFAULT_VIEWPORT_WIDTH = 480;
export const DEFAULT_VIEWPORT_HEIGHT = 320;
export const DEFAULT_MIN_ZOOM = 0.5;
export const DEFAULT_MAX_ZOOM = 3;
export const ZOOM_STEP = 0.15;

// Escala entre o backend e a tela: quantos milímetros (coordenadas LH2 do
// backend) cabem em UMA célula do grid. O backend guarda tamanho de cenário,
// obstáculos e posições em mm; as telas desenham em células. Derivada do
// lado do bloco (`BLOCK_SIDE_M` = 0,2 m => 200 mm) — o mesmo valor mostrado
// no rodapé do mapa ("1 bloco = 0.2 × 0.2 m"). É o único lugar a mudar.
export const MM_PER_CELL = Math.round(BLOCK_SIDE_M * 1000);
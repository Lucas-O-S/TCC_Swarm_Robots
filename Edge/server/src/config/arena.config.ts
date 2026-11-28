import 'dotenv/config';

const positive = (value: string | undefined): number | null => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Área dos modos sem LH2 (GATEWAY_MODE=mqtt ou simulator), em mm, começando em
 * (0, 0) - o referencial em que o RobotSwarmSimulator já trabalha. No modo
 * mari a área vem da calibração carregada e isto é ignorado. Vazio ou
 * inválido = área desconhecida.
 */
export const arenaConfig = {
    widthMm: positive(process.env.ARENA_WIDTH_MM),
    heightMm: positive(process.env.ARENA_HEIGHT_MM),
};

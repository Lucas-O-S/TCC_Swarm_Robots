import { Lh2LayoutDto } from "./lh2.layout.dto";

/**
 * Recálculo da calibração carregada para outro layout, sem voltar ao chão
 * (vale enquanto a base station não sair do lugar). Os quatro campos da área
 * são obrigatórios aqui; distanceMm só muda se o lado foi digitado errado.
 */
export class Lh2ReframeDto extends Lh2LayoutDto {}

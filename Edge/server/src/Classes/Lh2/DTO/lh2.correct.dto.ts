import { Lh2LayoutDto } from "./lh2.layout.dto";

/**
 * Correção de medida digitada errado na calibração carregada (lado, largura,
 * altura ou posição na área), sem voltar ao chão. Só vai o que estava
 * errado; o resto continua como está. Vale enquanto a base station não sair
 * do lugar e se os cantos foram capturados nas marcas certas.
 */
export class Lh2CorrectDto extends Lh2LayoutDto {}

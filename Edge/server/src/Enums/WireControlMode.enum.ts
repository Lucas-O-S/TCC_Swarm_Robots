/**
 * Modo de controle COMO O ROBÔ ENTENDE (ControlModeType do protocolo DotBot).
 * Só existem 0 e 1 no rádio. O "SemiAuto" é regra de negócio de quem usa a
 * borda (a API do front tem o dela) e nunca chega aqui: quem chama converte
 * antes. No firmware 1.22.0 o CONTROL_MODE só para os motores e aborta os
 * waypoints - o valor em si é ignorado.
 */
export enum WireControlMode {
    Manual = 0,
    Auto = 1,
}

/**
 * Modo de controle COMO O ROBÔ ENTENDE (ControlModeType do protocolo DotBot).
 * Só existem 0 e 1 no rádio. O "SemiAuto" é regra de negócio de quem usa a
 * borda (a API do front tem o dela) e nunca chega aqui: quem chama converte
 * antes. No firmware (1.22.0 e 1.23.0) o CONTROL_MODE só zera os motores uma
 * vez - o valor é ignorado e ele NÃO aborta os waypoints; quem tira o robô do
 * Auto é o LH2_WAYPOINTS vazio que o CommandService manda junto.
 */
export enum WireControlMode {
    Manual = 0,
    Auto = 1,
}

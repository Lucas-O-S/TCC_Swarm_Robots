

/**
 * Regra do BACKEND sobre quem pode comandar o robô; a fonte da verdade é
 * robots.mode, não o robô. 0 e 1 batem com o ControlModeType do protocolo
 * (MANUAL = 0, AUTO = 1), mas no firmware DotBot 1.22.0 isso não é um modo
 * configurável: o CONTROL_MODE só para os motores (valor ignorado), o robô
 * entra em Auto sozinho ao receber waypoints, e o `mode` do advertisement vai
 * zerado. SemiAuto (2) só existe aqui: nunca é enviado ao robô.
 */
export enum RobotControlMode {
    /** Humano dirige no joystick; o orquestrador não mexe. */
    Manual = 0,
    /** Orquestrador atribui tasks sozinho (fila -> primeiro robô livre). */
    Auto = 1,
    /**
     * Executa tasks de forma autônoma (segue waypoints), mas NÃO recebe
     * atribuição automática: espera um humano atribuir a task manualmente.
     * Ou seja: não é manual, mas fica fora da fila do orquestrador.
     */
    SemiAuto = 2
}

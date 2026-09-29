

/**
 * 0 e 1 batem com o ControlModeType do protocolo/firmware DotBot
 * (MANUAL = 0, AUTO = 1) - é o valor que vai no pacote CONTROL_MODE e que o
 * robô devolve no campo `mode` do advertisement. SemiAuto (2) só existe no
 * backend: nunca é enviado ao robô.
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



export enum RobotControlMode {
    /** Orquestrador atribui tasks sozinho (fila -> primeiro robô livre). */
    Auto = 0,
    /** Humano dirige no joystick; o orquestrador não mexe. */
    Manual = 1,
    /**
     * Executa tasks de forma autônoma (segue waypoints), mas NÃO recebe
     * atribuição automática: espera um humano atribuir a task manualmente.
     * Ou seja: não é manual, mas fica fora da fila do orquestrador.
     */
    SemiAuto = 2
}
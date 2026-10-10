/**
 * Eventos que a borda empurra pelo socket.io para quem estiver conectado
 * (a API do front ou qualquer outro sistema). É parte do contrato público:
 * renomear quebra os clientes.
 */
export enum EdgeSocketEvents {
    /** Novo dado decodificado de um robô (RobotState). */
    RobotState = "robot:state",
    /** Mudança de status por silêncio (Active/Inactive/Lost). */
    RobotStatus = "robot:status",
    /** Primeiro advertisement de um robô desde que a borda subiu. */
    RobotJoined = "robot:joined",
}

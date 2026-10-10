/**
 * Eventos que a BORDA emite pelo socket.io dela (contrato público da borda).
 * Cópia proposital do enum de Edge/server: a API é só mais um cliente e não
 * importa código da borda. Não confundir com `SocketEvents`, que é o que a
 * API emite pro front.
 */
export enum EdgeSocketEvents {
    RobotState = "robot:state",
    RobotStatus = "robot:status",
    RobotJoined = "robot:joined",
}

/**
 * Nomes dos eventos que o backend emite pro FRONT via WebSocket (socket.io).
 *
 * Separado do `EventsCommands`: aquele é o barramento INTERNO (EventEmitter2,
 * backend-pra-backend, ex. `robot.advertisement`); este é o contrato com o
 * CLIENTE, com a convenção `robot:xxx`. Mantê-los em enums distintos evita
 * confundir o que é interno com o que o front consome.
 */
export enum SocketEvents {
    RobotUpdate = "robot:update",
    RobotStatus = "robot:status",
}

import { PositionSource } from "src/Enums/PositionSource.enum";
import { RobotStatus } from "src/Enums/RobotStatus.enum";
import { RobotModel } from "src/Model/Robot.Model";

/**
 * Formato dos eventos que a API emite pro FRONT (nomes em `SocketEvents`).
 *
 * Mesmos nomes e unidades do RobotModel/REST (battery em Volts, lastSync como
 * `updatedAt`), pra o front tratar igual o que vem do `GET /robots` e do socket.
 * Sem envelope ApiResponse de propósito: evento é push, não tem requisição nem
 * erro - o nome do evento já diz o que é.
 */

/** Posição já tratada pela borda. x/y em mm (LH2) ou graus (GPS, x=lat, y=lon). */
export interface RobotPositionEvent {
    source: PositionSource;
    x: number;
    y: number;
    direction: number | null;
}

/** `robot:update` - a cada estado novo do robô (~500 ms no firmware). */
export interface RobotUpdateEvent {
    address: string;
    /** null = payload sem posição ou sem leitura (ex.: LH2 sem lighthouse). */
    position: RobotPositionEvent | null;
    /** Volts, igual `robots.battery`. null = payload sem bateria. */
    battery: number | null;
    waypointIdx: number | null;
    /** ISO 8601 - mesmo instante que vira `robots.last_sync`. */
    updatedAt: string;
}

/** `robot:status` - status mudou (Active/Inactive/Lost por silêncio). */
export interface RobotStatusEvent {
    address: string;
    status: RobotStatus;
}

/** `robot:new` - robô cadastrado no primeiro anúncio. */
export interface RobotNewEvent {
    robot: RobotModel;
}

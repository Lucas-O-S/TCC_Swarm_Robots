import { Command } from "src/Enums/Command.enum";
import { RobotSnapshot } from "src/Classes/Swarm/Robot.State";

export interface RobotSnapshotEvent {
    robots: RobotSnapshot[];
}

/** Comando que o back manda pelo uplink. Mesmos campos da rota POST /v1/robots/:address/commands/:comando. */
export interface UplinkCommand {
    address: string;
    command: Command;
    payload: unknown;
}

/** Resposta do ack. `status` segue o HTTP (400 = corpo recusado, 500 = erro da borda). */
export type UplinkCommandReply =
    | { ok: true; data: unknown }
    | { ok: false; status: number; message: string };

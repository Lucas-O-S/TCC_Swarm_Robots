import { PayloadType } from "src/Enums/PayloadType.enum";
import { Lh2State } from "src/Protocols/Swarmit/Swarmit.Protocol";

/**
 * Token de injeção. Como `GatewayAdapter` é uma interface (some em runtime),
 * o Nest não consegue injetar por tipo - a gente injeta por este token e
 * decide no módulo qual implementação usar (Simulador ou Serial).
 */
export const GATEWAY_ADAPTER = "GATEWAY_ADAPTER";

export interface GatewayAdapter{

    send(
        destination : string,
        payloadType : PayloadType,
        body : Buffer,
        version? : number,
        type? : number
    ): void


    onFrameReceived(
        callback : (frame : Buffer) => void
    ) : void;


    /**
     * Calibração LH2 do robô, para o transporte que sabe (só o Mari, via
     * SwarmIT). Opcional: simulador e MQTT não implementam, e o estado sai com
     * lh2 = null - para a API, "transporte sem SwarmIT", sem checar calibração.
     */
    lh2Of?(address : string) : Lh2State | null;


}
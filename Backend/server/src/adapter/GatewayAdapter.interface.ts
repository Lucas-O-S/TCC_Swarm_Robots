import { PayloadType } from "src/Enums/PayloadType.enum";

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

}
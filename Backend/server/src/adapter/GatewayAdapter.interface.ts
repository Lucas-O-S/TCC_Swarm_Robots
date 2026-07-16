import { PayloadType } from "src/Enums/PayloadType.enum";


export interface GatewayAdapter{

    send(
        destination : String,
        payloadType : PayloadType,
        body : Buffer,
        version : number,
        type : number
    ): void


    onFrameReceived(
            callback : (frame : Buffer) => void
        ) : void;

}
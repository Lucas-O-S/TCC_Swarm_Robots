import { Injectable } from "@nestjs/common";
import { Protocol, Frame } from "src/Protocols/Protocol";
import { GatewayAdapter } from "../GatewayAdapter.interface";
import { PayloadType } from "src/Enums/PayloadType.enum";


@Injectable()
export class SimulatorGatewayAdapter implements GatewayAdapter{


    send(
        destination: string,
        payloadType: PayloadType,
        body: Buffer,
        version: number = 1,
        type: number = 16,
    ): void {

        const header : Buffer = Protocol.buildHeader(
            destination,
            version,
            type
        );

        const bytes : Buffer = Protocol.buildFrame(
            new Frame(header, payloadType, body)
        );

        console.log("[SIMULADOR] enviando frame:", bytes.toString("hex"));

    }

    onFrameReceived(
        callback: (frame: Buffer) => void
    ): void {
        setTimeout(() => {
            const simulatedFrame = Buffer.from([0x01, 0x02, 0x03]); 
            callback(simulatedFrame);
        }, 1000);
    }

}
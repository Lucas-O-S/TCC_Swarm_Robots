import { Injectable } from "@nestjs/common";
import { Protocol, Frame } from "src/Protocols/Protocol";
import { GatewayAdapter } from "../GatewayAdapter.interface";
import { PayloadType } from "src/Enums/PayloadType.enum";
import { simulatorConfig } from "src/config/simulator.config";


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

        if (!simulatorConfig.fakeAdvertisement) {
            return;
        }

        // Simula um robô fake "reportando" um advertisement a cada 3s. Como é
        // um frame que ENTRA, o `source` (offset 10) é o endereço do robô.
        const fakeRobot = "0000000000000001";
        const advBody = Buffer.from(
            "01a6ffe8030000d0070000e40cce32019cffffffc8000000dc0500002003000003",
            "hex",
        );

        setInterval(() => {
            const header = Protocol.buildHeader("0000000000000000", 1, 16, fakeRobot);

            const frame = Protocol.buildFrame(
                new Frame(header, PayloadType.DOTBOT_ADVERTISEMENT, advBody)
            );

            callback(frame);
        }, 3000);
    }

}
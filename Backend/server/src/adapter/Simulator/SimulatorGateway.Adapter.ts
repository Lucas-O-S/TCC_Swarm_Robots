import { Injectable } from "@nestjs/common";
import { Protocol, Frame } from "src/Protocols/Protocol";
import { GatewayAdapter } from "../GatewayAdapter.interface";
import { PayloadType } from "src/Enums/PayloadType.Enum";
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
        // um frame que ENTRA, o `source` (offset 10) é o endereço do robô -
        // por isso montamos o header na mão aqui (o buildHeader é pro envio,
        // onde source=0).
        const fakeRobot = "0000000000000001";
        const advBody = Buffer.from(
            "01a6ffe8030000d0070000e40cce32019cffffffc8000000dc0500002003000003",
            "hex",
        );

        setInterval(() => {
            const header = Buffer.alloc(18);
            header.writeUInt8(1, 0);                                  // version
            header.writeUInt8(16, 1);                                 // type = DATA
            header.writeBigUInt64LE(0n, 2);                           // destination = gateway
            header.writeBigUInt64LE(BigInt("0x" + fakeRobot), 10);    // source = robô

            const frame = Buffer.concat([
                header,
                Buffer.from([PayloadType.DOTBOT_ADVERTISEMENT]),
                advBody,
            ]);

            callback(frame);
        }, 3000);
    }

}
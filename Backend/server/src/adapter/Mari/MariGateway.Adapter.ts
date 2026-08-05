import { Injectable, OnModuleInit } from "@nestjs/common";
import { GatewayAdapter } from "../GatewayAdapter.interface";
import { Protocol } from "src/Protocols/Protocol";
import { PayloadType } from "src/Enums/PayloadType.enum";
import { HdlcCodec } from "src/Protocols/Mari/Hdlc/HdlcCodec";
import { HdlcHandler } from "src/Protocols/Mari/Hdlc/HdlcHandler";
import { MariProtocol } from "src/Protocols/Mari/Mari.Protocol";
import { MariHeader, MariFrame } from "src/Protocols/Mari/Mari.Payload";
import { NextProto } from "src/Enums/NextProto.enum";
import { EdgeEvent } from "src/Enums/EdgeEvent.enum";
import { mariConfig } from "src/config/Mari.Config";

@Injectable()
export class MariGatewayAdapter implements GatewayAdapter, OnModuleInit {
    
    private port: any = null;
    
    private readonly codec = new HdlcCodec();
    
    private frameCallback: ((frame: Buffer) => void) | null = null;
    
    private readonly hdlc = new HdlcHandler((p) => this.onEdgePayload(p));

    onModuleInit(): void {
        this.connect();
    }

    private connect(): void {
        try {
           
            const { SerialPort } = require("serialport");
           
            this.port = new SerialPort({ path: mariConfig.port, baudRate: mariConfig.baudrate });
           
            this.port.on("data", (chunk: Buffer) => this.hdlc.push(chunk));
           
            this.port.on("error", (e: Error) => console.error("[MARI] serial:", e.message));
           
            this.port.on("open", () => console.log(`[MARI] conectado em ${mariConfig.port}`));

        } catch (error) {
            console.error("[MARI] não abriu a serial (serialport instalado? porta certa?)", error);
        }
    }

    send(destination: string, payloadType: PayloadType, body: Buffer): void {
        const packet = Buffer.concat([Buffer.from([payloadType]), body]);
        
        const header: MariHeader = {
            version: 3,
            type: 16,
            networkId: mariConfig.networkId,
            destination,
            source: "0000000000000000",
            nextProto: NextProto.DOTBOT_APP,
        };
   
        const frame = MariProtocol.buildMariFrame(header, packet);
        const hdlc = this.codec.hdlcEncode(MariProtocol.wrapEdgeEvent(EdgeEvent.NODE_DATA, frame));
   
        if (!this.port) {
            console.error("[MARI] serial não conectada");
            return;
        }
   
        this.port.write(hdlc);
    }

    onFrameReceived(callback: (frame: Buffer) => void): void {
        this.frameCallback = callback;
    }

    private onEdgePayload(payload: Buffer): void {
        if (payload.length < 1 || payload[0] !== EdgeEvent.NODE_DATA) return;
        const mari = MariProtocol.parseMariFrame(payload.subarray(1));
        if (mari.header.nextProto !== NextProto.DOTBOT_APP) return;
        this.frameCallback?.(this.toInternalFrame(mari));
    }

    // Traduz o Mari frame pro formato interno de 18B (source@10 + payloadType@18)
    // que o SwarmService já lê - por isso Swarm/Robot/Orchestrator não mudam.
    private toInternalFrame(mari: MariFrame): Buffer {
        const header = Protocol.buildHeader(mari.header.destination, 1, 16, mari.header.source);
        return Buffer.concat([header, mari.payload]);
    }
}

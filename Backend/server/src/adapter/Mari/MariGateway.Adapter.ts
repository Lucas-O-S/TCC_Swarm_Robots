import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
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
import { SwarmitPayloadType } from "src/Enums/SwarmitPayloadType.enum";
import { SwarmitDeviceStatus } from "src/Enums/SwarmitDeviceStatus.enum";
import { SwarmitProtocol } from "src/Protocols/Swarmit/Swarmit.Protocol";
import { SwarmitFleet, SwarmitNode } from "./SwarmitFleet";

@Injectable()
export class MariGatewayAdapter implements GatewayAdapter, OnModuleInit, OnModuleDestroy {
    
    private port: any = null;
    
    private readonly codec = new HdlcCodec();
    
    private frameCallback: ((frame: Buffer) => void) | null = null;
    
    private readonly hdlc = new HdlcHandler((p) => this.onEdgePayload(p));

    // Estado da malha SwarmIT. Os frames de status já chegavam nesta serial a
    // ~1 Hz e eram descartados por não serem DOTBOT_APP; agora alimentam este
    // registro, que é o que permite saber quem está parado no bootloader.
    private readonly fleet = new SwarmitFleet();

    private readonly lastLoggedStatus = new Map<string, SwarmitDeviceStatus>();

    private autoStartTimer: NodeJS.Timeout | null = null;

    onModuleInit(): void {
        this.connect();
        if (mariConfig.autoStart) {
            // O bootloader do swarmit nunca dá boot sozinho num power-on, e o
            // status chega de segundo em segundo: um tick curto faz o backend
            // reagir ao robô voltando, sem ninguém rodar comando nenhum.
            this.autoStartTimer = setInterval(() => this.driveAutoStart(), 500);
            console.log("[SWARMIT] auto-start ligado (MARI_AUTO_START=true)");
        }
    }

    onModuleDestroy(): void {
        if (this.autoStartTimer) clearInterval(this.autoStartTimer);
        this.autoStartTimer = null;
        try { this.port?.close?.(); } catch { /* fechando de qualquer jeito */ }
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
        this.sendPacket(destination, NextProto.DOTBOT_APP, packet);
    }

    // Mesmo caminho de saída do send(), trocando só o multiplex do header: o
    // protocolo do testbed (status, start/stop) vive em NextProto 0x10, o da
    // aplicação DotBot em 0x11.
    sendSwarmit(destination: string, packet: Buffer): void {
        this.sendPacket(destination, NextProto.SWARMIT_TESTBED, packet);
    }

    private sendPacket(destination: string, nextProto: NextProto, packet: Buffer): void {
        const header: MariHeader = {
            version: 3,
            type: 16,
            networkId: mariConfig.networkId,
            destination,
            source: "0000000000000000",
            nextProto,
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

    // Visão da malha para quem quiser expor num endpoint ou alimentar o twin.
    swarmitFleet(): SwarmitNode[] {
        return this.fleet.list();
    }

    private onEdgePayload(payload: Buffer): void {
        if (payload.length < 1 || payload[0] !== EdgeEvent.NODE_DATA) return;
        const mari = MariProtocol.parseMariFrame(payload.subarray(1));

        if (mari.header.nextProto === NextProto.SWARMIT_TESTBED) {
            this.onSwarmitPacket(mari);
            return;
        }

        if (mari.header.nextProto !== NextProto.DOTBOT_APP) return;
        this.frameCallback?.(this.toInternalFrame(mari));
    }

    private onSwarmitPacket(mari: MariFrame): void {
        const packet = mari.payload;
        if (packet.length < 1) return;

        const address = mari.header.source;

        if (packet[0] === SwarmitPayloadType.SWARMIT_STATUS) {
            const status = SwarmitProtocol.parseStatus(packet);
            // Payload de outro formato = robô velho demais para conversar. O
            // swarmit também descarta em vez de adivinhar campos.
            if (!status) return;

            this.fleet.onStatus(address, status);

            if (this.lastLoggedStatus.get(address) !== status.status) {
                this.lastLoggedStatus.set(address, status.status);
                const pct = SwarmitProtocol.batteryPct(status.device, status.batteryMv);
                console.log(
                    `[SWARMIT] ${address} ${SwarmitDeviceStatus[status.status]} ` +
                    `${(status.batteryMv / 1000).toFixed(2)}V (${pct}%)`
                );
            }
            return;
        }

        if (packet[0] === SwarmitPayloadType.SWARMIT_DEVICE_INFO_RESP) {
            const info = SwarmitProtocol.parseDeviceInfo(packet);
            if (!info) return;
            this.fleet.onDeviceInfo(address, info);
            console.log(`[SWARMIT] ${address} imagem: ${SwarmitProtocol.imageLabel(info)}`);
        }
    }

    private driveAutoStart(): void {
        if (!this.port) return;

        for (const address of this.fleet.takeNoImageWarnings()) {
            console.warn(
                `[SWARMIT] ${address} está sem imagem (none) - não vou dar start. ` +
                `Carregue a aplicação por OTA antes (swarm flash).`
            );
        }

        const actions = this.fleet.plan();

        for (const address of actions.requestInfo) {
            this.sendSwarmit(address, SwarmitProtocol.buildDeviceInfoRequest());
        }

        for (const address of actions.start) {
            // Sempre endereçado, um robô por vez. START em broadcast trava
            // quem não tem imagem e o watchdog derruba os vizinhos junto.
            console.log(`[SWARMIT] start -> ${address}`);
            this.sendSwarmit(address, SwarmitProtocol.buildStart());
        }
    }

    // Traduz o Mari frame pro formato interno de 18B (source@10 + payloadType@18)
    // que o SwarmService já lê - por isso Swarm/Robot/Orchestrator não mudam.
    private toInternalFrame(mari: MariFrame): Buffer {
        const header = Protocol.buildHeader(mari.header.destination, 1, 16, mari.header.source);
        return Buffer.concat([header, mari.payload]);
    }
}

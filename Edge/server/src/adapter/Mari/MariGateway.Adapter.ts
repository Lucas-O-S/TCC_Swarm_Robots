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
import { Lh2Flags, SwarmitDeviceStatus } from "src/Enums/SwarmitDeviceStatus.enum";
import { Lh2Sample, Lh2State, SwarmitProtocol } from "src/Protocols/Swarmit/Swarmit.Protocol";
import { SwarmitFleet, SwarmitNode } from "./SwarmitFleet";
import { HOST_ADDRESS } from "src/Constants/Address.Constants";
import { FRAME_TYPE_DATA, FRAME_VERSION } from "src/Constants/Frame.Constants";
import { MARI_TYPE_DATA, MARI_VERSION } from "src/Constants/Mari.Constants";
import { Lh2Calibration } from "src/Protocols/Swarmit/Lh2Calibration";
import { lh2Config } from "src/config/lh2.config";
import { Lh2Homography } from "src/Protocols/Swarmit/Lh2Homography";
import { Lh2Corner } from "src/Enums/Lh2Corner.enum";
import { LH2_CAPTURE_DEFAULTS, Lh2CaptureSession } from "./Lh2CaptureSession";

// Espaço entre as matrizes de um mesmo envio (uma por estação). O swarmit usa
// 0,3 s: o enlace não é confiável e uma rajada pode estourar a fila do gateway.
// Com até 16 estações cabe nos 5 s do calibrateIntervalMs do SwarmitFleet.
const LH2_MATRIX_GAP_MS = 300;

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

    private fleetTimer: NodeJS.Timeout | null = null;

    // Calibração LH2 carregada (LH2_CALIBRATION_FILE ou, sem ele, o TOML mais
    // recente do LH2_CALIBRATION_DIR). null = não calibra.
    private calibration: Lh2Calibration | null = null;

    // setTimeouts das matrizes ainda por sair, para não escrever na serial
    // depois do onModuleDestroy.
    private readonly pendingSends = new Set<NodeJS.Timeout>();

    // Captura LH2 em andamento (uma por vez: a borda tem um gateway só).
    private capture: Lh2CaptureSession | null = null;

    onModuleInit(): void {
        // Antes da serial: arquivo configurado e inválido derruba a borda no
        // boot com o motivo no log. Só logar deixaria os robôs sem calibração
        // sem ninguém perceber.
        this.calibration = MariGatewayAdapter.loadCalibration();
        if (this.calibration) {
            console.log(`[LH2] calibração carregada: ${MariGatewayAdapter.channels(this.calibration)} de ${this.calibration.source}`);
        }

        this.connect();

        this.fleet.configure({
            autoStart: mariConfig.autoStart,
            lh2StationCount: this.calibration?.count ?? null,
        });

        // Roda sempre no modo mari: o device-info (imagem + calibração LH2) é
        // pedido mesmo sem auto-start, porque é dele que sai o lh2 do estado.
        // O bootloader do swarmit nunca dá boot sozinho num power-on, e o
        // status chega de segundo em segundo: um tick curto faz a borda reagir
        // ao robô voltando, sem ninguém rodar comando nenhum.
        this.fleetTimer = setInterval(() => this.driveFleet(), 500);

        if (mariConfig.autoStart) {
            console.log("[SWARMIT] auto-start ligado (MARI_AUTO_START=true)");
        }
    }

    onModuleDestroy(): void {
        if (this.fleetTimer) 
            clearInterval(this.fleetTimer);
       
        this.fleetTimer = null;

        for (const timer of this.pendingSends)
            clearTimeout(timer);
        
        this.pendingSends.clear();

        this.capture?.cancel("borda desligando");
        this.capture = null;
        
        try { 
            this.port?.close?.();
        }
        
        catch { /* fechando de qualquer jeito */ }
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
            version: MARI_VERSION,
            type: MARI_TYPE_DATA,
            networkId: mariConfig.networkId,
            destination,
            source: HOST_ADDRESS,
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

    // Robô que a malha nunca reportou = não calibrado. Nunca null no modo mari:
    // null diria à API que o transporte não tem SwarmIT.
    lh2Of(address: string): Lh2State {
        return this.fleet.lh2Of(address);
    }

    // Visão da malha para quem quiser expor num endpoint ou alimentar o twin.
    swarmitFleet(): SwarmitNode[] {
        return this.fleet.list();
    }

    // Calibração carregada (null = nenhuma: LH2_CALIBRATION_FILE vazio e nenhum
    // TOML no LH2_CALIBRATION_DIR).
    lh2Calibration(): Lh2Calibration | null {
        return this.calibration;
    }

    // Reenvia a calibração no próximo tick, mesmo para robô que já reporta
    // calibrado - para quando a arena foi recalibrada e o arquivo trocou. Sem
    // endereço, vale para a frota toda. O robô precisa estar em Bootloader
    // (em Running o net core ignora). Devolve os endereços marcados.
    forceLh2Calibration(address?: string): string[] {
        if (!this.calibration) {
            throw new Error("nenhuma calibração carregada (LH2_CALIBRATION_FILE vazio e nenhum TOML no LH2_CALIBRATION_DIR)");
        }

        return this.fleet.forceCalibrate(address);
    }

    // --- captura LH2 (o `lh2-calibration collect`, dentro da borda) ---------

    // Reserva o robô: a borda dá STOP se ele estiver rodando e não calibra nem
    // dá START nele até solve/cancel. Uma captura por vez; calibra todas as
    // bases que o robô enxergar.
    beginLh2Capture(address: string, distanceMm: number, tag: string | null): Lh2CaptureSession {
        if (this.capture)
            throw new Error(`já existe captura em andamento para ${this.capture.address} - resolva ou cancele antes`);

        const node = this.fleet.hold(address);
        if (!node)
            throw new Error(`a malha SwarmIT nunca reportou o robô '${Protocol.normalizeAddress(address)}'`);

        this.capture = new Lh2CaptureSession(node.address, distanceMm, tag, () => {
            this.sendSwarmit(node.address, SwarmitProtocol.buildLh2Capture());
        }, LH2_CAPTURE_DEFAULTS);

        console.log(`[LH2] captura iniciada em ${node.address} (quadrado de ${distanceMm} mm, todas as bases que ele enxergar)`);
        return this.capture;
    }

    lh2CaptureSession(): Lh2CaptureSession | null {
        return this.capture;
    }

    // O robô precisa estar em Bootloader: em Running o lado seguro não atende.
    captureLh2Corner(corner: Lh2Corner): Promise<Lh2Sample[]> {
        const session = this.capture;
        if (!session) return Promise.reject(new Error("nenhuma captura em andamento"));

        const state = this.fleet.get(session.address)?.status.status;
        if (state !== SwarmitDeviceStatus.Bootloader) {
            const nome = state === undefined ? "sumiu da malha" : SwarmitDeviceStatus[state];
            return Promise.reject(new Error(`${session.address} não está em Bootloader (${nome}) - espere o STOP pegar`));
        }

        return session.capture(corner).then((samples) => {
            const canais = samples.map((s) => `canal ${s.lhIndex + 1} (count1=${s.count1} count2=${s.count2})`).join(", ");
            console.log(`[LH2] ${session.address} ${corner}: ${canais}`);
            return samples;
        });
    }

    // Calcula uma homografia por base, grava tudo num TOML (mesmo formato do
    // PyDotBot), adota como calibração carregada e marca a frota toda para
    // receber - arena recalibrada vale para todos os robôs. Solta o robô
    // reservado. keptOnRestart = false quando o LH2_CALIBRATION_FILE aponta
    // para outro arquivo, que volta a valer no próximo boot.
    solveLh2Capture(): { calibration: Lh2Calibration; marked: string[]; keptOnRestart: boolean } {
        const session = this.capture;
        if (!session) throw new Error("nenhuma captura em andamento");

        const matrices = new Map<number, Buffer>();
        for (const [station, corners] of session.cornersByStation()) {
            try {
                matrices.set(station, Lh2Homography.toWire(Lh2Homography.fromCorners(corners, session.distanceMm)));
            } catch (error) {
                throw new Error(`base do canal ${station + 1}: ${(error as Error).message}`);
            }
        }

        const draft = Lh2Calibration.forStations(matrices, "captura");
        const path = draft.saveToml(lh2Config.calibrationDir, { distanceMm: session.distanceMm, tag: session.tag ?? undefined });
        const calibration = Lh2Calibration.fromPayload(draft.payload, path);

        this.calibration = calibration;
        this.fleet.configure({ lh2StationCount: calibration.count });
        const marked = this.fleet.forceCalibrate();

        this.fleet.release(session.address);
        this.capture = null;

        const keptOnRestart = !lh2Config.calibrationFile;
        console.log(
            `[LH2] calibração (${MariGatewayAdapter.channels(calibration)}) salva em ${path} e carregada - ` +
            (keptOnRestart
                ? "continua valendo depois de reiniciar (é o TOML mais recente do LH2_CALIBRATION_DIR)"
                : `ao reiniciar volta a valer o LH2_CALIBRATION_FILE (${lh2Config.calibrationFile}); esvazie-o para manter esta`)
        );
        return { calibration, marked, keptOnRestart };
    }

    cancelLh2Capture(): boolean {
        const session = this.capture;
        if (!session) return false;
        session.cancel();
        this.fleet.release(session.address);
        this.capture = null;
        console.log(`[LH2] captura de ${session.address} cancelada`);
        return true;
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

        if (packet[0] === SwarmitPayloadType.SWARMIT_EVENT_LOG) {
            const log = SwarmitProtocol.parseEventLog(packet);
            if (!log) {
                console.log(`[LH2] ${address} EVENT_LOG cortado (${packet.length} B) - descartado`);
                return;
            }
            const samples = SwarmitProtocol.parseLh2Samples(log.data);
            if (samples.length > 0) {
                const canais = samples.map((s) => `canal ${s.lhIndex + 1} (count1=${s.count1} count2=${s.count2})`).join(", ");
                console.log(`[LH2] ${address} enxerga: ${canais}`);
                this.capture?.onSamples(address, samples);
            } else {
                // Sem a tag de captura: log de texto do robô (ou captura vazia).
                console.log(`[LH2] ${address} EVENT_LOG sem amostras (${log.data.length} B): ${log.data.toString("latin1")}`);
            }
            return;
        }

        if (packet[0] === SwarmitPayloadType.SWARMIT_DEVICE_INFO_RESP) {
            const info = SwarmitProtocol.parseDeviceInfo(packet);
            if (!info) return;
            this.fleet.onDeviceInfo(address, info);
            const lh2 = SwarmitProtocol.lh2State(info);
            console.log(
                `[SWARMIT] ${address} imagem: ${SwarmitProtocol.imageLabel(info)}, ` +
                `lh2: ${lh2.deviceCount} estação(ões) ${lh2.valid ? "válida" : "inválida"}` +
                `${(info.lh2Flags & Lh2Flags.fromFlash) !== 0 ? " (da flash)" : ""}`
            );
        }
    }

    private driveFleet(): void {
        if (!this.port) return;

        // Sem auto-start ninguém recebe START, então o aviso não se aplica.
        
        const noImage = this.fleet.takeNoImageWarnings();
        
        if (mariConfig.autoStart) {
            for (const address of noImage) {
                console.warn(
                    `[SWARMIT] ${address} está sem imagem (none) - não vou dar start. ` +
                    `Carregue a aplicação por OTA antes (swarm flash).`
                );
            }
        }

        for (const address of this.fleet.takeCalibrationFailures()) {
            console.warn(
                `[LH2] ${address} continua sem calibração depois de todas as tentativas - ` +
                `segue sem LH2 (a API não entrega task). Confira o arquivo e a base station, ` +
                `ou force o reenvio com o robô em Bootloader.`
            );
        }

        const actions = this.fleet.plan();

        for (const address of actions.requestInfo) {
            this.sendSwarmit(address, SwarmitProtocol.buildDeviceInfoRequest());
        }

        for (const address of actions.calibrate) {
            this.sendCalibration(address);
        }

        for (const address of actions.stop) {
            // Robô reservado para a captura LH2: ela só roda em Bootloader.
            console.log(`[SWARMIT] stop -> ${address} (captura LH2)`);
            this.sendSwarmit(address, SwarmitProtocol.buildStop());
        }

        for (const address of actions.start) {
            // Sempre endereçado, um robô por vez. START em broadcast trava
            // quem não tem imagem e o watchdog derruba os vizinhos junto.
            console.log(`[SWARMIT] start -> ${address}`);
            this.sendSwarmit(address, SwarmitProtocol.buildStart());
        }
    }

    // Uma mensagem por estação, endereçada (nunca broadcast), na ordem do
    // índice: o 0 zera o buffer no net core e o último grava a flash e
    // reinicia o robô. Cada matriz sai uma vez - quem decide reenviar é o
    // SwarmitFleet, olhando o device-info depois do reboot (o swarmit manda
    // 5× às cegas; com 1 estação cada cópia regravaria a flash).
    private sendCalibration(address: string): void {
        const calibration = this.calibration;
        if (!calibration) return;

        console.log(`[LH2] calibração -> ${address} (${MariGatewayAdapter.channels(calibration)}, ${calibration.count} slot(s))`);

        calibration.matrices.forEach((matrix, index) => {
            const packet = SwarmitProtocol.buildLh2Calibration(calibration.count, index, matrix);

            if (index === 0) {
                this.sendSwarmit(address, packet);
                return;
            }

            const timer = setTimeout(() => {
                this.pendingSends.delete(timer);
                this.sendSwarmit(address, packet);
            }, index * LH2_MATRIX_GAP_MS);

            this.pendingSends.add(timer);
        });
    }

    // Traduz o Mari frame pro formato interno de 18B (source@10 + payloadType@18)
    // que o SwarmService já lê - por isso Swarm/Robot/Orchestrator não mudam.
    private toInternalFrame(mari: MariFrame): Buffer {
        const header = Protocol.buildHeader(mari.header.destination, FRAME_VERSION, FRAME_TYPE_DATA, mari.header.source);
        return Buffer.concat([header, mari.payload]);
    }

    // LH2_CALIBRATION_FILE manda; vazio, vale o TOML mais recente do
    // LH2_CALIBRATION_DIR (o último solve). O arquivo indicado e inválido
    // derruba a borda; o achado sozinho só vira aviso - ninguém pediu por ele.
    private static loadCalibration(): Lh2Calibration | null {
        if (lh2Config.calibrationFile) return Lh2Calibration.fromFile(lh2Config.calibrationFile);

        const latest = Lh2Calibration.latestToml(lh2Config.calibrationDir);
        if (!latest) return null;

        try {
            return Lh2Calibration.fromFile(latest);
        } catch (error) {
            console.warn(`[LH2] ${latest} ignorado (${(error as Error).message}) - a borda sobe sem calibração`);
            return null;
        }
    }

    // "canal 7" / "canais 1, 3" - os slots zerados não contam.
    private static channels(calibration: Lh2Calibration): string {
        const canais = calibration.stations.map((i) => i + 1);
        return `${canais.length > 1 ? "canais" : "canal"} ${canais.join(", ")}`;
    }
}

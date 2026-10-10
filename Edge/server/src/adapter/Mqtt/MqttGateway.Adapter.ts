import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { connect, MqttClient } from "mqtt";
import { GatewayAdapter } from "../GatewayAdapter.interface";
import { PayloadType } from "src/Enums/PayloadType.enum";
import { MariProtocol } from "src/Protocols/Mari/Mari.Protocol";
import { MariHeader, MariFrame } from "src/Protocols/Mari/Mari.Payload";
import { NextProto } from "src/Enums/NextProto.enum";
import { EdgeEvent } from "src/Enums/EdgeEvent.enum";
import { Protocol } from "src/Protocols/Protocol";
import { mqttConfig } from "src/config/mqtt.config";

// NETID = network_id em 4 hex MAIÚSCULOS (igual marilib/simulador).
const netid = (n: number) => n.toString(16).padStart(4, "0").toUpperCase();
const toEdgeTopic = (n: number) => `/mari/${netid(n)}/to_edge`;   // comandos  (backend -> sim)
const toCloudTopic = (n: number) => `/mari/${netid(n)}/to_cloud`; // telemetria (sim -> backend)

/**
 * Adapter MQTT: conecta a API ao RobotSwarmSimulator (gateway + frota simulada,
 * sem hardware) pela fronteira do marilib. É o `MariGatewayAdapter` com o
 * transporte trocado - em vez de HDLC sobre serial, publica/assina o mesmo
 * `[1B EdgeEvent] + Mari frame` em base64 sobre MQTT. O backend é o lado CLOUD:
 * publica comandos em to_edge, assina telemetria em to_cloud (o simulador faz
 * o inverso). Ver AGENTS.md, "Conexão com o RobotSwarmSimulator".
 */
@Injectable()
export class MqttGatewayAdapter implements GatewayAdapter, OnModuleInit, OnModuleDestroy {

    private client: MqttClient | null = null;

    private frameCallback: ((frame: Buffer) => void) | null = null;

    private readonly toEdge = toEdgeTopic(mqttConfig.networkId);

    private readonly toCloud = toCloudTopic(mqttConfig.networkId);

    onModuleInit(): void {
        this.client = connect(mqttConfig.url, { protocolVersion: mqttConfig.protocolVersion });

        this.client.on("connect", () => {
            console.log(`[MQTT] conectado em ${mqttConfig.url} - assinando ${this.toCloud}`);
            this.client!.subscribe(this.toCloud, { qos: 0 });
        });

        this.client.on("message", (topic, payload) => {
            if (topic !== this.toCloud) return;
            this.onCloudMessage(payload.toString());
        });

        this.client.on("error", (e: Error) => console.error("[MQTT] erro:", e.message));
    }

    onModuleDestroy(): void {
        this.client?.end();
    }

    // Igual ao MariGatewayAdapter, mas publica base64 em to_edge no lugar de HDLC na serial.
    send(destination: string, payloadType: PayloadType, body: Buffer): void {
        const packet = Buffer.concat([Buffer.from([payloadType]), body]); // DotBot Packet

        const header: MariHeader = {
            version: 3,
            type: 16,
            networkId: mqttConfig.networkId,
            destination,
            source: "0000000000000000",
            nextProto: NextProto.DOTBOT_APP,
        };

        const frame = MariProtocol.buildMariFrame(header, packet);
        const wire = MariProtocol.wrapEdgeEvent(EdgeEvent.NODE_DATA, frame); // [EdgeEvent] + Mari

        if (!this.client) {
            console.error("[MQTT] cliente não conectado");
            return;
        }

        this.client.publish(this.toEdge, wire.toString("base64"), { qos: 0 });
    }

    onFrameReceived(callback: (frame: Buffer) => void): void {
        this.frameCallback = callback;
    }

    // to_cloud -> base64([EdgeEvent] + Mari frame). Só NODE_DATA de app DotBot vira
    // frame interno pro SwarmService (JOINED/LEFT/KEEP_ALIVE/GATEWAY_INFO ignorados por ora).
    private onCloudMessage(b64: string): void {
        const wire = Buffer.from(b64, "base64");
        if (wire.length < 1 || wire[0] !== EdgeEvent.NODE_DATA) return;

        const mari = MariProtocol.parseMariFrame(wire.subarray(1));
        if (mari.header.networkId !== mqttConfig.networkId) return; // rede alheia
        if (mari.header.nextProto !== NextProto.DOTBOT_APP) return; // swarmit fica de fora por ora

        this.frameCallback?.(this.toInternalFrame(mari));
    }

    // Mari frame -> frame interno de 18B (source@10 + payloadType@18) que o SwarmService
    // já lê. IDÊNTICO ao MariGatewayAdapter - Swarm/Robot/Orchestrator não mudam.
    private toInternalFrame(mari: MariFrame): Buffer {
        const header = Protocol.buildHeader(mari.header.destination, 1, 16, mari.header.source);
        return Buffer.concat([header, mari.payload]);
    }
}

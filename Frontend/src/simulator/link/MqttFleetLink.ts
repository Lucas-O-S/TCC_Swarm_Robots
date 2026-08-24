import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import { EdgeEvent, NextProto } from '../protocol/enums';
import { buildMariFrame, parseMariFrame, unwrapEdgeEvent, wrapEdgeEvent } from '../protocol/mariFrame';
import { encodeSimulatorData } from '../protocol/payloads';
import { base64ToBytes, bytesToBase64 } from '../protocol/base64';
import type { CommandHandler, FleetLink, FleetTelemetry } from './FleetLink';

export interface MqttFleetLinkOptions {
  url: string;
  networkId: number;
}

// NETID = network_id em 4 hex maiúsculos, igual ao marilib/RobotSwarmSimulator
// (ver AGENTS.md, "Conexão com o RobotSwarmSimulator").
function topic(part: 'to_edge' | 'to_cloud', networkId: number): string {
  const netid = networkId.toString(16).padStart(4, '0').toUpperCase();
  return `/mari/${netid}/${part}`;
}

// Implementação padrão de FleetLink: o simulador entra como o lado "edge"
// (gateway + frota) de um broker MQTT, publicando telemetria em `to_cloud` e
// assinando comandos em `to_edge` — o inverso do papel do backend. Payload
// MQTT = base64([EdgeEvent] + Mari frame), QoS 0.
export class MqttFleetLink implements FleetLink {
  private client: MqttClient | null = null;
  private commandHandler: CommandHandler | null = null;
  private readonly toEdge: string;
  private readonly toCloud: string;

  constructor(private readonly options: MqttFleetLinkOptions) {
    this.toEdge = topic('to_edge', options.networkId);
    this.toCloud = topic('to_cloud', options.networkId);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = mqtt.connect(this.options.url, { protocolVersion: 5 });
      this.client = client;

      client.on('connect', () => {
        client.subscribe(this.toEdge, { qos: 0 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      client.on('message', (receivedTopic, payload) => {
        if (receivedTopic === this.toEdge) this.handleIncoming(payload.toString());
      });

      client.on('error', (err) => reject(err));
    });
  }

  disconnect(): void {
    this.client?.end(true);
    this.client = null;
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  onCommand(handler: CommandHandler): void {
    this.commandHandler = handler;
  }

  publishTelemetry(entries: FleetTelemetry[]): void {
    if (!this.client?.connected) return;

    for (const entry of entries) {
      const packet = encodeSimulatorData(entry.theta, entry.posX, entry.posY);
      const frame = buildMariFrame(
        {
          version: 3,
          type: 16,
          networkId: this.options.networkId,
          destination: '0000000000000000',
          source: entry.address,
          nextProto: NextProto.DOTBOT_APP,
        },
        packet,
      );
      const wire = wrapEdgeEvent(EdgeEvent.NODE_DATA, frame);
      this.client.publish(this.toCloud, bytesToBase64(wire), { qos: 0 });
    }
  }

  // to_edge -> base64([EdgeEvent] + Mari frame). Só NODE_DATA de app DotBot
  // vira comando pro World (JOINED/LEFT/KEEP_ALIVE/GATEWAY_INFO ignorados).
  private handleIncoming(base64Payload: string): void {
    const wire = base64ToBytes(base64Payload);
    if (wire.length < 1) return;

    const { event, frame } = unwrapEdgeEvent(wire);
    if (event !== EdgeEvent.NODE_DATA) return;

    const mari = parseMariFrame(frame);
    if (mari.header.networkId !== this.options.networkId) return;
    if (mari.header.nextProto !== NextProto.DOTBOT_APP) return;
    if (mari.payload.length < 1) return;

    const payloadType = mari.payload[0];
    const body = mari.payload.subarray(1);
    this.commandHandler?.(mari.header.destination, payloadType, body);
  }
}

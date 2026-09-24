import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import { DotBotControlMode } from '../enums/DotBotControlMode.enum';
import { EdgeEvent } from '../enums/EdgeEvent.enum';
import { NextProto } from '../enums/NextProto.enum';
import { PayloadType } from '../enums/PayloadType.enum';
import { buildMariFrame, parseMariFrame, unwrapEdgeEvent, wrapEdgeEvent } from './Protocols/Mari/Mari.Protocol';
import {
  decodeControlMode,
  decodeMoveRaw,
  decodeRgbLed,
  decodeWaypoints,
  encodeDotBotAdvertisement,
  encodeGatewayInfo,
  encodeNodeInfoCloud,
} from './Protocols/DotBot.Payload';
import { base64ToBytes, bytesToBase64 } from './Protocols/Base64';
import type { FleetCommand, FleetLink, FleetUplink } from './FleetLink';

export interface MqttFleetLinkOptions {
  /** Broker em WebSocket, ex.: ws://localhost:9001 (o Mosquitto do RobotSwarmSimulator). */
  url: string;
  /** network_id (u16) — TEM que bater com o MARI_NETWORK_ID do backend e com o cenário. */
  networkId: number;
  /** Address do gateway simulado (16 hex). */
  gatewayAddress: string;
  log?: (msg: string) => void;
}

// NETID = network_id em 4 hex maiúsculos, igual ao marilib/RobotSwarmSimulator.
function topic(part: 'to_edge' | 'to_cloud', networkId: number): string {
  const netid = networkId.toString(16).padStart(4, '0').toUpperCase();
  return `/mari/${netid}/${part}`;
}

// Borda MQTT do gateway simulado — a implementação de FleetLink pra quando a
// API estiver no ar (AGENTS.md, "Conexão com o RobotSwarmSimulator"). O
// simulador entra como o lado "edge": publica em `to_cloud` e assina
// `to_edge` — o inverso do backend. Payload = base64([EdgeEvent] + dados),
// QoS 0, igual ao src/link/MqttLink.ts do RobotSwarmSimulator.
//
// AINDA NÃO LIGADO NA TELA: enquanto não há conexão com a API a Simulação
// roda com o LocalFleetLink (offline). Trocar é só instanciar este link no
// lugar do outro em screens/Simulation/useSimulation.ts.
//
// Fora de escopo por ora (igual ao MqttGatewayAdapter planejado no backend):
// uplinks swarmit — o backend filtra next_proto = DOTBOT_APP.
export class MqttFleetLink implements FleetLink {
  private client: MqttClient | null = null;
  private commandCb: ((cmd: FleetCommand) => void) | null = null;
  private readonly toEdge: string;
  private readonly toCloud: string;
  private readonly options: MqttFleetLinkOptions;
  private readonly log: (msg: string) => void;

  constructor(options: MqttFleetLinkOptions) {
    this.options = options;
    this.toEdge = topic('to_edge', options.networkId);
    this.toCloud = topic('to_cloud', options.networkId);
    this.log = options.log ?? (() => {});
  }

  start(): Promise<void> {
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

  stop(): Promise<void> {
    this.client?.end(true);
    this.client = null;
    return Promise.resolve();
  }

  onCommand(cb: (cmd: FleetCommand) => void): void {
    this.commandCb = cb;
  }

  publishUplink(uplink: FleetUplink): void {
    if (!this.client?.connected) return;
    const wire = this.encodeUplink(uplink);
    if (wire) this.client.publish(this.toCloud, bytesToBase64(wire), { qos: 0 });
  }

  private encodeUplink(uplink: FleetUplink): Uint8Array | null {
    const { gatewayAddress, networkId } = this.options;
    switch (uplink.kind) {
      case 'gateway-info':
        return wrapEdgeEvent(EdgeEvent.GATEWAY_INFO, encodeGatewayInfo(gatewayAddress, networkId, uplink.asn, uplink.timer));
      case 'node-joined':
        return wrapEdgeEvent(EdgeEvent.NODE_JOINED, encodeNodeInfoCloud(uplink.address, gatewayAddress));
      case 'node-left':
        return wrapEdgeEvent(EdgeEvent.NODE_LEFT, encodeNodeInfoCloud(uplink.address, gatewayAddress));
      case 'node-keep-alive':
        return wrapEdgeEvent(EdgeEvent.NODE_KEEP_ALIVE, encodeNodeInfoCloud(uplink.address, gatewayAddress));
      case 'node-data': {
        const frame = buildMariFrame(
          {
            version: 3,
            type: 16,
            networkId,
            destination: gatewayAddress,
            source: uplink.source,
            nextProto: NextProto.DOTBOT_APP,
          },
          encodeDotBotAdvertisement(uplink.payload),
        );
        return wrapEdgeEvent(EdgeEvent.NODE_DATA, frame);
      }
      case 'swarmit-data':
        return null;
    }
  }

  // to_edge → base64([EdgeEvent] + frame Mari). Só NODE_DATA de app DotBot vira comando.
  private handleIncoming(base64Payload: string): void {
    const wire = base64ToBytes(base64Payload);
    if (wire.length < 1) return;

    const { event, frame } = unwrapEdgeEvent(wire);
    if (event !== EdgeEvent.NODE_DATA) return;

    const mari = parseMariFrame(frame);
    if (mari.header.networkId !== this.options.networkId) {
      this.log(`downlink ignorado: network_id 0x${mari.header.networkId.toString(16)} não é o nosso`);
      return;
    }
    if (mari.header.nextProto !== NextProto.DOTBOT_APP || mari.payload.length < 1) return;

    const destination = mari.header.destination.toUpperCase();
    const body = mari.payload.subarray(1);
    let cmd: FleetCommand | null = null;

    switch (mari.payload[0]) {
      case PayloadType.CMD_MOVE_RAW: {
        const m = decodeMoveRaw(body);
        cmd = { kind: 'move-raw', destination, left_x: m.leftX, left_y: m.leftY, right_x: m.rightX, right_y: m.rightY };
        break;
      }
      case PayloadType.CMD_RGB_LED: {
        const c = decodeRgbLed(body);
        cmd = { kind: 'rgb', destination, red: c.red, green: c.green, blue: c.blue };
        break;
      }
      case PayloadType.CONTROL_MODE:
        cmd = {
          kind: 'control-mode',
          destination,
          mode: decodeControlMode(body) === DotBotControlMode.Auto ? DotBotControlMode.Auto : DotBotControlMode.Manual,
        };
        break;
      case PayloadType.LH2_WAYPOINTS: {
        const w = decodeWaypoints(body);
        cmd = { kind: 'waypoints', destination, threshold: w.threshold, waypoints: w.points };
        break;
      }
      default:
        this.log(`payload_type 0x${mari.payload[0].toString(16)} não é comando — ignorado`);
    }

    if (cmd) this.commandCb?.(cmd);
  }
}

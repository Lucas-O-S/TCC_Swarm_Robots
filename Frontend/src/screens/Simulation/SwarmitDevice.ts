import { SwarmitDeviceStatus, SwarmitDeviceType } from '../../enums/SwarmitDeviceStatus.enum';
import { SwarmitPayloadType } from '../../enums/SwarmitPayloadType.enum';
import { batteryToMillivolts } from '../../Integration/Protocols/DotBot.Payload';
import type { SwarmitPayload } from '../../Integration/Protocols/Swarmit/Swarmit.Protocol';
import type { SimRobot } from './SimRobot';

// Respondedor swarmit do LADO DISPOSITIVO — porte do RobotSwarmSimulator
// (src/net/swarmitDevice.ts). Quem ORQUESTRA (decide flashar/iniciar/parar)
// é sempre o backend; o robô só REAGE: roda a máquina de estados, dá ACK por
// chunk do OTA e devolve heartbeat de status. Puro, sem I/O.
//
//   Bootloader ──OTA_START──▶ Programming ──(chunks+ACKs)──▶ Programming
//   Programming/Bootloader ──START──▶ Running ──STOP──▶ Bootloader
//   qualquer ──RESET(x,y)──▶ Bootloader (+ teleporta pra pose informada)
export class SwarmitDevice {
  private _status: SwarmitDeviceStatus = SwarmitDeviceStatus.Bootloader;
  private expectedChunks = 0;
  private readonly received = new Set<number>();
  private readonly robot: SimRobot;
  private readonly device: SwarmitDeviceType;

  constructor(robot: SimRobot, device: SwarmitDeviceType = SwarmitDeviceType.DotBotV3) {
    this.robot = robot;
    this.device = device;
  }

  get status(): SwarmitDeviceStatus {
    return this._status;
  }

  /** Progresso do flash em [0, 1]. */
  get flashProgress(): number {
    if (this.expectedChunks <= 0) return this._status === SwarmitDeviceStatus.Running ? 1 : 0;
    return Math.min(1, this.received.size / this.expectedChunks);
  }

  heartbeat(): SwarmitPayload {
    return this.statusPayload();
  }

  private statusPayload(): SwarmitPayload {
    return {
      type: SwarmitPayloadType.SWARMIT_STATUS,
      device: this.device,
      status: this._status,
      battery: batteryToMillivolts(this.robot.battery),
      pos_x: Math.round(this.robot.pos_x),
      pos_y: Math.round(this.robot.pos_y),
    };
  }

  /** Reage a um comando que desceu; devolve os payloads que devem SUBIR. */
  onCommand(cmd: SwarmitPayload): SwarmitPayload[] {
    switch (cmd.type) {
      case SwarmitPayloadType.SWARMIT_STATUS:
        return [this.statusPayload()];

      case SwarmitPayloadType.SWARMIT_OTA_START:
        this._status = SwarmitDeviceStatus.Programming;
        this.expectedChunks = cmd.fw_chunk_count;
        this.received.clear();
        return [{ type: SwarmitPayloadType.SWARMIT_OTA_START_ACK }];

      case SwarmitPayloadType.SWARMIT_OTA_CHUNK:
        // ARQ pare-e-espere: reenvio do mesmo índice re-ACKa sem duplicar efeito.
        this.received.add(cmd.index);
        return [{ type: SwarmitPayloadType.SWARMIT_OTA_CHUNK_ACK, index: cmd.index }];

      case SwarmitPayloadType.SWARMIT_START:
        this._status = SwarmitDeviceStatus.Running;
        return [this.statusPayload()];

      case SwarmitPayloadType.SWARMIT_STOP:
        this._status = SwarmitDeviceStatus.Bootloader;
        return [this.statusPayload()];

      case SwarmitPayloadType.SWARMIT_RESET:
        this.robot.pos_x = cmd.pos_x;
        this.robot.pos_y = cmd.pos_y;
        this._status = SwarmitDeviceStatus.Bootloader;
        return [this.statusPayload()];

      default:
        // ACKs só sobem — ignorados se chegarem descendo.
        return [];
    }
  }
}

import { SwarmitPayloadType } from "src/Enums/SwarmitPayloadType.enum";
import { SwarmitDeviceStatus, SwarmitDeviceType } from "src/Enums/SwarmitDeviceStatus.enum";

// Codec do protocolo SwarmIT, byte a byte igual ao swarmit 0.9.0
// (swarmit/testbed/protocol.py). Só os payloads que o backend precisa:
// STATUS e DEVICE_INFO na recepção; START, STOP e REQUEST_MESSAGE no envio.
//
// Tudo little-endian, como no dotbot_utils.protocol.Payload.to_bytes().

// PayloadStatus: 15 campos de tamanho fixo, 43 B depois do byte de tipo.
// O tamanho é validado de propósito - o comentário no fonte do swarmit diz que
// não existe caminho de compatibilidade para um frame mais curto: payload de
// outro formato vem de um robô velho demais para conversar, e o certo é
// descartar (o robô simplesmente não aparece) em vez de adivinhar campos.
export const SWARMIT_STATUS_PAYLOAD_LEN = 43;

// INFO_STRING_LEN = 32, IMAGE_DIGEST_LEN = 8 no swarmit.
const INFO_STRING_LEN = 32;
const IMAGE_DIGEST_LEN = 8;
export const SWARMIT_DEVICE_INFO_PAYLOAD_LEN =
    1 + 1 + 4 + 4 + INFO_STRING_LEN + INFO_STRING_LEN + 1 + 1 + 4 + IMAGE_DIGEST_LEN + INFO_STRING_LEN + INFO_STRING_LEN + 1 + 1;

export interface SwarmitStatus {
    device: SwarmitDeviceType;
    status: SwarmitDeviceStatus;
    batteryMv: number;
    posX: number;
    posY: number;
    resetReason: number;
    fault: number;
    fromNs: number;
    cfsr: number;
    sfsr: number;
    pc: number;
    lr: number;
    sp: number;
    psr: number;
    // Muda quando qualquer coisa do bloco device-info muda. É o gatilho para
    // pedir o bloco de novo - em regime permanente, custo zero de tráfego.
    infoGen: number;
}

export interface SwarmitDeviceInfo {
    infoVersion: number;
    infoGen: number;
    bootCount: number;
    uptimeS: number;
    blVersion: string;
    netVersion: string;
    imageState: number;
    imageResult: number;
    imageSize: number;
    imageDigest: string;
    imageName: string;
    imageVersion: string;
    lh2HomographyCount: number;
    lh2Flags: number;
}

export class SwarmitProtocol {

    // --- envio -------------------------------------------------------------

    // PayloadStart/PayloadStop são PayloadEmpty: o pacote é só o byte do tipo.
    static buildStart(): Buffer {
        return Buffer.from([SwarmitPayloadType.SWARMIT_START]);
    }

    static buildStop(): Buffer {
        return Buffer.from([SwarmitPayloadType.SWARMIT_STOP]);
    }

    // PayloadRequestMessage: msg_id (1B) + flags (1B). msg_id é o tipo da
    // resposta desejada - hoje só DEVICE_INFO_RESP existe.
    static buildDeviceInfoRequest(): Buffer {
        return Buffer.from([
            SwarmitPayloadType.SWARMIT_REQUEST_MESSAGE,
            SwarmitPayloadType.SWARMIT_DEVICE_INFO_RESP,
            0x00,
        ]);
    }

    // --- recepção ----------------------------------------------------------

    // Recebe o pacote SwarmIT completo (byte de tipo + corpo).
    static parseStatus(packet: Buffer): SwarmitStatus | null {
        if (packet.length < 1 || packet[0] !== SwarmitPayloadType.SWARMIT_STATUS) return null;
        const body = packet.subarray(1);
        if (body.length !== SWARMIT_STATUS_PAYLOAD_LEN) return null;

        let o = 0;
        const u8 = () => body.readUInt8(o++);
        const u16 = () => { const v = body.readUInt16LE(o); o += 2; return v; };
        const u32 = () => { const v = body.readUInt32LE(o); o += 4; return v; };
        const i32 = () => { const v = body.readInt32LE(o); o += 4; return v; };

        return {
            device: u8() as SwarmitDeviceType,
            status: u8() as SwarmitDeviceStatus,
            batteryMv: u16(),
            posX: i32(),
            posY: i32(),
            resetReason: u32(),
            fault: u8(),
            fromNs: u8(),
            cfsr: u32(),
            sfsr: u32(),
            pc: u32(),
            lr: u32(),
            sp: u32(),
            psr: u32(),
            infoGen: u8(),
        };
    }

    static parseDeviceInfo(packet: Buffer): SwarmitDeviceInfo | null {
        if (packet.length < 1 || packet[0] !== SwarmitPayloadType.SWARMIT_DEVICE_INFO_RESP) return null;
        const body = packet.subarray(1);
        if (body.length !== SWARMIT_DEVICE_INFO_PAYLOAD_LEN) return null;

        let o = 0;
        const u8 = () => body.readUInt8(o++);
        const u32 = () => { const v = body.readUInt32LE(o); o += 4; return v; };
        // Strings vêm com padding de zeros no buffer de tamanho fixo.
        const str = (len: number) => {
            const raw = body.subarray(o, o + len); o += len;
            const end = raw.indexOf(0);
            return raw.subarray(0, end === -1 ? raw.length : end).toString("utf8");
        };
        const hex = (len: number) => {
            const raw = body.subarray(o, o + len); o += len;
            return raw.toString("hex").toUpperCase();
        };

        return {
            infoVersion: u8(),
            infoGen: u8(),
            bootCount: u32(),
            uptimeS: u32(),
            blVersion: str(INFO_STRING_LEN),
            netVersion: str(INFO_STRING_LEN),
            imageState: u8(),
            imageResult: u8(),
            imageSize: u32(),
            imageDigest: hex(IMAGE_DIGEST_LEN),
            imageName: str(INFO_STRING_LEN),
            imageVersion: str(INFO_STRING_LEN),
            lh2HomographyCount: u8(),
            lh2Flags: u8(),
        };
    }

    // --- derivados ---------------------------------------------------------

    // Mesmo critério do DeviceInfo.has_image do swarmit: tamanho > 0 OU digest
    // não-zerado. Serve para não dar START num robô sem aplicação carregada -
    // isso trava a placa e o watchdog reseta, derrubando os vizinhos.
    static hasImage(info: SwarmitDeviceInfo): boolean {
        return info.imageSize > 0 || info.imageDigest.replace(/0/g, "") !== "";
    }

    // Mesmo rótulo da coluna Image da tabela do CLI.
    static imageLabel(info: SwarmitDeviceInfo | undefined): string {
        if (!info) return "-";
        if (!SwarmitProtocol.hasImage(info)) return "none";
        return info.imageName || info.imageDigest.slice(0, 16) || "-";
    }

    // Carga restante, 0-100. O DotBot v3 roda supercapacitor: a energia
    // armazenada vai com V^2 e o robô apaga em 0,6 V, então a fração útil é
    // entre os quadrados, não entre as tensões (swarmit: battery_pct).
    static batteryPct(device: SwarmitDeviceType, batteryMv: number): number {
        const supercap = device === SwarmitDeviceType.DotBotV3;
        const maxMv = 3000;
        const emptyMv = supercap ? 600 : 0;
        const num = supercap ? batteryMv ** 2 - emptyMv ** 2 : batteryMv - emptyMv;
        const den = supercap ? maxMv ** 2 - emptyMv ** 2 : maxMv - emptyMv;
        if (den <= 0) return 0;
        return Math.max(0, Math.min(100, Math.trunc((num / den) * 100)));
    }
}

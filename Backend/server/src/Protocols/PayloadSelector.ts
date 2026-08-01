import { PayloadType } from "src/Enums/PayloadType.Enum";
import { PayloadCoder, PayloadDecoder } from "./Wrappers/PayloadProtocol";
import { MovePayloadProtocol } from "./Wrappers/Encode/MovePayload.wrapper";
import { RgbLedPayloadProtocol } from "./Wrappers/Encode/RgbLedPayload.wrapper";
import { ControlModePayloadProtocol } from "./Wrappers/Encode/ControlModePayload.wrapper";
import { Lh2WaypointsPayloadProtocol } from "./Wrappers/Encode/Lh2WaypointsPayload.wrapper";
import { XgoActionPayloadProtocol } from "./Wrappers/Encode/XgoActionPayload.wrapper";
import { AdvertisementProtocol } from "./Wrappers/Decode/Advertisement.wrapper";
import { GpsPositionProtocol } from "./Wrappers/Decode/GpsPosition.wrapper";
import { DotBotAdvertisementProtocol } from "./Wrappers/Decode/DotBotAdvertisement.wrapper";
import { SailBotDataProtocol } from "./Wrappers/Decode/SailBotData.wrapper";
import { Lh2ProcessedLocationProtocol } from "./Wrappers/Decode/Lh2ProcessedLocation.wrapper";
import { DotBotSimulatorDataProtocol } from "./Wrappers/Decode/DotBotSimulatorData.wrapper";

/**
 * Factory: escolhe o wrapper certo a partir do tipo de payload. Útil quando o
 * tipo só é conhecido em runtime (ex.: decode de um frame recebido). Pro
 * envio, o Service normalmente já sabe o comando e chama o wrapper direto.
 */
export class PayloadSelector {

    static getPayloadCoder(payloadType: number): PayloadCoder<any> | null {
        switch (payloadType) {
            case PayloadType.CMD_MOVE_RAW:
                return new MovePayloadProtocol();
            case PayloadType.CMD_RGB_LED:
                return new RgbLedPayloadProtocol();
            case PayloadType.CONTROL_MODE:
                return new ControlModePayloadProtocol();
            case PayloadType.LH2_WAYPOINTS:
                return new Lh2WaypointsPayloadProtocol();
            case PayloadType.CMD_XGO_ACTION:
                return new XgoActionPayloadProtocol();
            default:
                return null;
        }
    }

    static getPayloadDecoder(payloadType: number): PayloadDecoder<any> | null {
        switch (payloadType) {
            case PayloadType.ADVERTISEMENT:
                return new AdvertisementProtocol();
            case PayloadType.GPS_POSITION:
                return new GpsPositionProtocol();
            case PayloadType.DOTBOT_ADVERTISEMENT:
                return new DotBotAdvertisementProtocol();
            case PayloadType.SAILBOT_DATA:
                return new SailBotDataProtocol();
            case PayloadType.LH2_PROCESSED_DATA:
                return new Lh2ProcessedLocationProtocol();
            case PayloadType.DOTBOT_SIMULATOR_DATA:
                return new DotBotSimulatorDataProtocol();
            default:
                return null;
        }
    }

}

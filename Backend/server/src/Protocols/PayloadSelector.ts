import { PayloadType } from "src/Enums/PayloadType.enum";
import { PayloadProtocol } from "./Wrappers/PayloadProtocol";
import { MovePayloadProtocol } from "./Wrappers/MovePayload.wrapper";
import { RgbLedPayloadProtocol } from "./Wrappers/RgbLedPayload.wrapper";
import { ControlModePayloadProtocol } from "./Wrappers/ControlModePayload.wrapper";
import { Lh2WaypointsPayloadProtocol } from "./Wrappers/Lh2WaypointsPayload.wrapper";
import { XgoActionPayloadProtocol } from "./Wrappers/XgoActionPayload.wrapper";

/**
 * Factory: escolhe o wrapper certo a partir do tipo de payload. Útil quando o
 * tipo só é conhecido em runtime (ex.: decode de um frame recebido). Pro
 * envio, o Service normalmente já sabe o comando e chama o wrapper direto.
 */
export class PayloadSelector {

    static getPayloadCodec(payloadType: number): PayloadProtocol<any> | null {
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
}

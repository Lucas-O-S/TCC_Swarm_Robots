import { HdlcEnum } from "src/Enums/Hdlc.Enum";
import { HdlcHelper } from "./HdlcHelper";


export class HdlcCodec {

    constructor() {

    }

    hdlcEncode(payload : Buffer ): Buffer{
        
        const out : number[] = [HdlcEnum.FLAG];

        let frameCheckSequence = HdlcEnum.FCS_INIT;

        for (let i = 0; i < payload.length; i++) {
        
            const payloadByte = payload[i];

            frameCheckSequence = HdlcHelper.frameCheckUpdate(frameCheckSequence, payloadByte);
            
            HdlcHelper.escapeByte(out, payloadByte);
            
        }

        frameCheckSequence = 0xffff - frameCheckSequence;

        HdlcHelper.escapeByte(out, frameCheckSequence & 0xff);
        HdlcHelper.escapeByte(out, (frameCheckSequence >> 8) & 0xff);

        out.push(HdlcEnum.FLAG);

        return Buffer.from(out);


    }

    hdlcDecode(frame : Buffer) : Buffer {

        const output : number[] = [];

        let frameCheckSequence = HdlcEnum.FCS_INIT;

        let escape = false

        for (let i = 1; i < frame.length - 1; i++) {

            const step = HdlcHelper.unescapeStep(frame[i], escape);
            escape = step.escape;

            if (step.emit !== undefined) {
                output.push(step.emit);
                frameCheckSequence = HdlcHelper.frameCheckUpdate(frameCheckSequence, step.emit);
            }

        }

        if(output.length < 2)
            throw new Error("Invalid HDLC frame");

        if(frameCheckSequence !== HdlcEnum.FCS_OK)
            throw new Error("Invalid HDLC frame checksum");

        return Buffer.from(output.slice(0, -2));

    }


}
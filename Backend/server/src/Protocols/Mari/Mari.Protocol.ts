import { NextProto } from "src/Enums/NextProto.enum";
import { MariFrame, MariHeader } from "./Mari.Payload";
import { EdgeEvent } from "src/Enums/EdgeEvent.enum";


export class MariProtocol {


    static buildMariHeader (header : MariHeader) : Buffer {
        const buffer = Buffer.alloc(21);
        
        buffer.writeUInt8(header.version,0);
        buffer.writeUInt8(header.type,1);
        buffer.writeUInt16LE(header.networkId, 2);
        buffer.writeBigUInt64LE(BigInt("0x" + header.destination),4);
        buffer.writeBigUInt64LE( BigInt("0x" + header.source) ,12);
        buffer.writeUInt8(header.nextProto,20);
        

        return buffer;
    }

    static parseMariHeader (buffer : Buffer) : MariHeader {
        const header : MariHeader = {
            version: buffer.readUInt8(0),
            type: buffer.readUInt8(1),
            networkId: buffer.readUInt16LE(2),
            destination: buffer.readBigUInt64LE(4).toString(16).padStart(16, "0"),
            source: buffer.readBigUInt64LE(12).toString(16).padStart(16, "0"),
            nextProto: buffer.readUInt8(20) as NextProto
        }
        return header;
    }

    static buildMariFrame (header : MariHeader, payload : Buffer) : Buffer {
       
        const headerBuffer = this.buildMariHeader(header);
       
        const frameBuffer = Buffer.concat([headerBuffer, payload]);
       
        return frameBuffer;
    
    }

    static parseMariFrame (frame : Buffer) : MariFrame {
        
        const header = this.parseMariHeader(frame.subarray(0, 21));

        const payload = frame.subarray(21);

        return {
            header: header,
            payload: payload
        }
    }

    static wrapEdgeEvent (event : EdgeEvent, mariFrame : Buffer) : Buffer{
        return Buffer.concat([Buffer.from([event]), mariFrame]);
    }

    





}
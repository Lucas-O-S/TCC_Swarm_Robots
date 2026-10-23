import { NextProto } from "src/Enums/NextProto.enum";
import { MariFrame, MariHeader } from "./Mari.Payload";
import { EdgeEvent } from "src/Enums/EdgeEvent.enum";
import { Protocol } from "src/Protocols/Protocol";
import { MARI_HEADER_LEN } from "src/Constants/Mari.Constants";


export class MariProtocol {


    static buildMariHeader (header : MariHeader) : Buffer {
        const buffer = Buffer.alloc(MARI_HEADER_LEN);
        
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
            destination: Protocol.readAddress(buffer, 4),
            source: Protocol.readAddress(buffer, 12),
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
        
        const header = this.parseMariHeader(frame.subarray(0, MARI_HEADER_LEN));

        const payload = frame.subarray(MARI_HEADER_LEN);

        return {
            header: header,
            payload: payload
        }
    }

    static wrapEdgeEvent (event : EdgeEvent, mariFrame : Buffer) : Buffer{
        return Buffer.concat([Buffer.from([event]), mariFrame]);
    }

    





}
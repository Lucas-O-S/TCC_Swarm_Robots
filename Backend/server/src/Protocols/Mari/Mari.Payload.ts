import { EdgeEvent } from "src/Enums/EdgeEvent.enum";
import { NextProto } from "src/Enums/NextProto.enum";


export interface MariHeader{
    version: number;
    type: number;
    networkId : number;
    destination: string;
    source: string;
    nextProto: NextProto;


}

export interface MariFrame {
    header: MariHeader
    payload: Buffer

}
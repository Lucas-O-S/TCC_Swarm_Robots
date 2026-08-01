import { HdlcEnum } from "src/Enums/Hdlc.Enum";
import { Fcs16Table } from "./Fcs16Table";

//HDLC = High-Level Data Link Control. É o protocolo de enquadramento — o esquema de flag/escape/checksum que a gente tá reproduzindo. É o "envelope" de cada mensagem na serial.
export class HdlcHelper {


    static frameCheckUpdate(frameCheckSequence: number, byte : number) : number {
        return (frameCheckSequence >> 8) ^ Fcs16Table[(frameCheckSequence ^ byte) & 0xff]; 

    }

    //mascara bytes de entrada e saida do meio para não confundir com as verdadeiras flags de inicio e fim
    static escapeByte(out: number[], byte: number) : void{

        if(byte === HdlcEnum.ESCAPE){
            out.push(
                HdlcEnum.ESCAPE,
                HdlcEnum.ESCAPE_ESCAPED
            )
        }

        else if(byte === HdlcEnum.FLAG){
            out.push(
                HdlcEnum.ESCAPE,
                HdlcEnum.FLAG_ESCAPED
            )
        }

        else{
            out.push(byte);
        }

    }

    // Processa um byte do meio do frame (já sem a FLAG de início/fim), atualizando
    // o estado de escape. Se o byte fizer parte do conteúdo real (não for só a
    // marcação de escape), devolve o valor já desmascarado em `emit` - quem chama
    // decide o que fazer com ele (push no output + atualizar o fcs).
    static unescapeStep(byte: number, escape: boolean): { escape: boolean; emit?: number } {

        if (byte === HdlcEnum.ESCAPE) {
            return { escape: true };
        }

        if (escape) {
            if (byte === HdlcEnum.ESCAPE_ESCAPED) byte = HdlcEnum.ESCAPE;
            else if (byte === HdlcEnum.FLAG_ESCAPED) byte = HdlcEnum.FLAG;

            return { escape: false, emit: byte };
        }

        return { escape: false, emit: byte };
    }


}
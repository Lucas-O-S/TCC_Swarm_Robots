import { HdlcEnum } from "src/Enums/Hdlc.Enum";
import { HdlcState } from "src/Enums/HdlcState.Enum";
import { HdlcHelper } from "./HdlcHelper";



export class HdlcHandler {

    private state = HdlcState.Idle;

    private frameCheckSequence = HdlcEnum.FCS_INIT;

    private output : number[] = [];

    private escape = false;

    constructor(
        private readonly onFrame : (payload : Buffer) => void
    ) {}

    push (bytes : Buffer) : void {

        for (const byte of bytes) 
            this.handleByte(byte);

    }

   private handleByte(byte: number): void {
        switch (this.state) {

            // Idle e Ready se comportam igual: esperando o início de um frame.
            case HdlcState.Idle:
            case HdlcState.Ready:
                this.handleIdleOrReady(byte);
                break;

            case HdlcState.Receiving:
                this.handleReceiving(byte);
                break;
        }
    }

    // Só a FLAG começa um frame; qualquer outro byte é ignorado.
    private handleIdleOrReady(byte: number): void {
        if (byte === HdlcEnum.FLAG) {
            this.output = [];
            this.frameCheckSequence = HdlcEnum.FCS_INIT;
            this.escape = false;
            this.state = HdlcState.Receiving;
        }
    }

    private handleReceiving(byte: number): void {
        if (byte === HdlcEnum.FLAG) {
            // FLAG com conteúdo dentro = fim do frame.
            if (this.output.length > 0) {
                this.state = HdlcState.Ready;
                this.finishFrame();
            }
            // FLAG com output vazio (duas flags seguidas) = ignora e segue.
            return;
        }

        // meio do frame: escape / acumula / atualiza o fcs
        const { escape, emit } = HdlcHelper.unescapeStep(byte, this.escape);
       
        this.escape = escape;

        if (emit !== undefined) {
            this.output.push(emit);
            this.frameCheckSequence = HdlcHelper.frameCheckUpdate(this.frameCheckSequence, emit);
        }
    }
    
    private finishFrame(): void {
        if (this.output.length >= 2 && this.frameCheckSequence === HdlcEnum.FCS_OK) {
            this.onFrame(Buffer.from(this.output.slice(0, -2)));
        }
        // se o FCS não bater, descarta em silêncio (frame corrompido)
    }

}
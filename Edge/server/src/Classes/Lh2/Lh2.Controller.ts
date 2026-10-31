import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiTags } from "@nestjs/swagger";
import { EdgeTokenGuard } from "src/Classes/Auth/EdgeToken.Guard";
import { Lh2Service } from "./Lh2.Service";
import { Lh2PushDto } from "./DTO/lh2.push.dto";
import { Lh2PushSchema } from "./Schema/Lh2Push.Schema";
import { Lh2CaptureStartDto } from "./DTO/lh2.capture.start.dto";
import { Lh2CaptureCornerDto } from "./DTO/lh2.capture.corner.dto";
import { Lh2CaptureCornerSchema, Lh2CaptureStartSchema } from "./Schema/Lh2Capture.Schema";

/**
 * Calibração LH2 (só no modo mari). A borda já calibra sozinha quem aparece
 * em Bootloader sem a calibração do arquivo; estas rotas servem para conferir
 * e para forçar o reenvio quando a arena for recalibrada.
 *
 * As rotas /session são a captura feita pela própria borda (o `dotbot swarm
 * lh2-calibration collect`, sem PyDotBot): começa a sessão com o robô, captura
 * os 4 cantos e resolve - o resultado é gravado em TOML e já sai para a frota.
 */
@Controller('lh2/calibration')
@ApiTags('LH2')
@ApiBearerAuth()
@UseGuards(EdgeTokenGuard)
export class Lh2Controller {

    constructor(private readonly lh2: Lh2Service) {}

    /** Arquivo carregado e a calibração reportada por cada robô da malha. */
    @Get()
    get() {
        return this.lh2.getCalibration();
    }

    /**
     * Reenvia a calibração no próximo ciclo, mesmo para robô que já reporta
     * calibrado. 202: só sai para robô em Bootloader; os outros ficam marcados.
     */
    @Post('push')
    @HttpCode(202)
    @ApiBody(Lh2PushSchema)
    push(@Body() dto: Lh2PushDto) {
        return this.lh2.push(dto.address);
    }

    /**
     * Reserva o robô para a captura (STOP se estiver rodando) e abre a sessão.
     * Calibra todas as bases que o robô enxergar.
     */
    @Post('session')
    @ApiBody(Lh2CaptureStartSchema)
    startCapture(@Body() dto: Lh2CaptureStartDto) {
        return this.lh2.startCapture(dto);
    }

    /** Cantos já capturados, o que falta, o canto em espera e as bases vistas. */
    @Get('session')
    getCapture() {
        return this.lh2.getCapture();
    }

    /**
     * Captura o canto onde o robô está agora, com a leitura de cada base que o
     * enxergar. Espera o robô (até ~20 s com os reenvios); 504 se ele não
     * responder.
     */
    @Post('session/capture')
    @HttpCode(200)
    @ApiBody(Lh2CaptureCornerSchema)
    captureCorner(@Body() dto: Lh2CaptureCornerDto) {
        return this.lh2.captureCorner(dto.corner);
    }

    /**
     * Calcula uma homografia por base, grava um TOML só, carrega e manda para a
     * frota. Encerra a sessão. 400 se faltar canto ou se alguma base vista não
     * tiver aparecido nos 4.
     */
    @Post('session/solve')
    @HttpCode(200)
    solveCapture() {
        return this.lh2.solveCapture();
    }

    /** Cancela a captura e solta o robô. */
    @Delete('session')
    cancelCapture() {
        return this.lh2.cancelCapture();
    }
}

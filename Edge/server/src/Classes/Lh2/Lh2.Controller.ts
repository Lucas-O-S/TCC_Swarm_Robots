import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiTags } from "@nestjs/swagger";
import { EdgeTokenGuard } from "src/Classes/Auth/EdgeToken.Guard";
import { Lh2Service } from "./Lh2.Service";
import { Lh2PushDto } from "./DTO/lh2.push.dto";
import { Lh2PushSchema } from "./Schema/Lh2Push.Schema";

/**
 * Calibração LH2 (só no modo mari). A borda já calibra sozinha quem aparece
 * em Bootloader sem a calibração do arquivo; estas rotas servem para conferir
 * e para forçar o reenvio quando a arena for recalibrada.
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
}

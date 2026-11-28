import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { EdgeTokenGuard } from "src/Classes/Auth/EdgeToken.Guard";
import { ArenaService } from "./Arena.Service";

/** Quem é este gateway e a área em que os robôs dele reportam a posição. */
@Controller()
@ApiTags('Arena')
@ApiBearerAuth()
@UseGuards(EdgeTokenGuard)
export class ArenaController {

    constructor(private readonly arena: ArenaService) {}

    /** Identidade do gateway: { edgeId, mode, networkId }. */
    @Get('gateway')
    gateway() {
        return this.arena.identity();
    }

    /** Área do gateway (ArenaView): calibração LH2 no modo mari, ARENA_* nos outros. */
    @Get('arena')
    view() {
        return this.arena.view();
    }
}

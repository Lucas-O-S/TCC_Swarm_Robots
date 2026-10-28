import { HttpException, Injectable, OnModuleInit } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { Command } from "src/Enums/Command.enum";
import { EdgeSocketEvents } from "src/Enums/EdgeSocketEvents.enum";
import { SwarmService } from "src/Classes/Swarm/Swarm.Service";
import { CommandService } from "src/Classes/Commands/Command.Service";
import { MoveRawDto } from "src/Classes/Commands/DTO/move.raw.dto";
import { RgbLedDto } from "src/Classes/Commands/DTO/rgb.led.dto";
import { ControlModeDto } from "src/Classes/Commands/DTO/control.mode.dto";
import { WaypointsDto } from "src/Classes/Commands/DTO/waypoints.dto";
import { XgoActionDto } from "src/Classes/Commands/DTO/xgo.action.dto";
import { UplinkService } from "../Uplink/Uplink.Service";
import { RobotSnapshotEvent, UplinkCommand, UplinkCommandReply } from "../Uplink/Uplink.Types";

/** DTO de cada comando - os mesmos das rotas REST. */
const DTO_OF: Record<Command, new () => object> = {
    [Command.MoveRaw]: MoveRawDto,
    [Command.RgbLed]: RgbLedDto,
    [Command.ControlMode]: ControlModeDto,
    [Command.Waypoints]: WaypointsDto,
    [Command.XgoAction]: XgoActionDto,
};

function messagesOf(errors: ValidationError[]): string[] {
    return errors.flatMap((error) => [...Object.values(error.constraints ?? {}), ...messagesOf(error.children ?? [])]);
}

/**
 * Liga o uplink ao resto da borda: manda o quadro da frota a cada conexão e
 * executa os comandos que chegam do back. Fica fora do UplinkService para não
 * fechar ciclo (SwarmService → EdgeWebsockets → UplinkService).
 */
@Injectable()
export class UplinkBridge implements OnModuleInit {

    constructor(
        private readonly uplink: UplinkService,
        private readonly swarm: SwarmService,
        private readonly commands: CommandService,
    ) {}

    onModuleInit(): void {
        this.uplink.onConnect(() => {

            const event: RobotSnapshotEvent = { robots: this.swarm.getAll() };
            this.uplink.emit(EdgeSocketEvents.RobotSnapshot, event);
        
        });

        this.uplink.onCommand((command) => this.run(command));
    }

    private async run({ address, command, payload }: UplinkCommand): Promise<UplinkCommandReply> {
        
        // hasOwn: "constructor"/"toString" não podem cair no protótipo do objeto.
        const dtoClass = Object.hasOwn(DTO_OF, command) ? DTO_OF[command] : undefined;

        if (!dtoClass) return { ok: false, status: 400, message: `Comando desconhecido '${command}'` };

        const dto = plainToInstance(dtoClass, payload ?? {});
        
        const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
        if (errors.length > 0) return { ok: false, status: 400, message: messagesOf(errors).join("; ") };

        try {
            return { ok: true, data: this.commands.send(address, command, dto) };
        } catch (error) {
            if (error instanceof HttpException) return { ok: false, status: error.getStatus(), message: error.message };
            console.error("[UPLINK] erro ao executar comando:", error);
            return { ok: false, status: 500, message: "Erro interno da borda" };
        }
    }
}

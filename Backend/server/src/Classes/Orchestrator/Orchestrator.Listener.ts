import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { OrchestratorService } from "./Orchestrator.Service";
import { EventsCommands } from "src/Enums/Events.Enum";


@Injectable()
export class OrchestratorListener {
    constructor(private readonly orchestrator: OrchestratorService) {}

    @OnEvent(EventsCommands.lost)
    handleLost(payload: { address: string }) {
        return this.orchestrator.releaseRobotTask(payload.address);
    }

    @OnEvent(EventsCommands.advertisement)
    handleAdvertisement(payload: { address: string; data: any }) {
        return this.orchestrator.onAdvertisement(payload.address, payload.data);
    }
}
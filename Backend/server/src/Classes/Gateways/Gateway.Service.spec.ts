import { NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test } from "@nestjs/testing";
import { GatewayService } from "./Gateway.Service";
import { GatewayRepository } from "./Gateway.Repository";
import { ScenarioService } from "src/Classes/Scenario/Scenario.Service";
import { EdgeClient } from "src/Classes/Edge/Edge.Client";
import { EdgeGateway } from "src/Classes/Edge/Edge.Gateway";
import { EdgeArenaView, EdgeGatewayIdentity } from "src/Classes/Edge/Edge.Types";
import { EventsCommands } from "src/Enums/Events.Enum";
import { GatewayMode } from "src/Enums/GatewayMode.enum";

/**
 * Teste unitário do GatewayService: repositório, ScenarioService, borda
 * (EdgeClient) e EventEmitter são mocks; os casos conferem o que o service
 * grava e avisa.
 */
describe("GatewayService", () => {
    let service: GatewayService;

    const identity: EdgeGatewayIdentity = { edgeId: "lab-borda", mode: GatewayMode.Mari, networkId: "1200" };
    const gateway = { uuid: "gw-1", ...identity, name: "lab-borda · mari · 1200", connected: false };

    // Área como a borda manda: calibração na área de 1,2 m (canto em 1000, 1000).
    const view: EdgeArenaView = {
        gateway: identity,
        source: "lh2",
        layout: "area",
        area: { x: 1000, y: 1000, width: 1200, height: 1200 },
        calibration: { x: 1200, y: 1200, width: 800, height: 800 },
        channels: [13],
        version: "2026-11-28T12:00:00.000Z",
        file: "/Users/x/.dotbot/calibrations/calibration-arena-taak.toml",
    };

    const gateways = { getByIdentity: jest.fn(), insert: jest.fn(), update: jest.fn(), exists: jest.fn(), markAllDisconnected: jest.fn() };
    const scenarios = { applyEdgeArea: jest.fn(), getByGateway: jest.fn() };
    const edge = { onGatewayUp: jest.fn(), onGatewayDown: jest.fn(), onArena: jest.fn() };
    const events = { emit: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();
        gateways.getByIdentity.mockResolvedValue(gateway);
        gateways.insert.mockResolvedValue(gateway);
        gateways.markAllDisconnected.mockResolvedValue(undefined);
        gateways.exists.mockResolvedValue(true);
        scenarios.applyEdgeArea.mockImplementation(async (gatewayId, name, fields) => ({ uuid: "sc-1", gatewayId, name, ...fields }));

        const moduleRef = await Test.createTestingModule({
            providers: [
                GatewayService,
                { provide: GatewayRepository, useValue: gateways },
                { provide: ScenarioService, useValue: scenarios },
                { provide: EdgeClient, useValue: edge },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = moduleRef.get(GatewayService);
    });

    it("boot: assina os eventos da borda e zera o connected", async () => {
        await service.onModuleInit();
        expect(edge.onGatewayUp).toHaveBeenCalled();
        expect(edge.onGatewayDown).toHaveBeenCalled();
        expect(edge.onArena).toHaveBeenCalled();
        expect(gateways.markAllDisconnected).toHaveBeenCalled();
    });

    it("borda conectou pela primeira vez: cria o gateway e marca conectado", async () => {
        gateways.getByIdentity.mockResolvedValue(null);

        await service.gatewayUp(identity);

        expect(gateways.insert).toHaveBeenCalledWith({ ...identity, name: "lab-borda · mari · 1200", connected: false });
        expect(gateways.update).toHaveBeenCalledWith({ connected: true, lastSeen: expect.any(Date) }, "gw-1");
    });

    it("borda conhecida: não cria de novo; ao cair, marca desconectado", async () => {
        await service.gatewayUp(identity);
        expect(gateways.insert).not.toHaveBeenCalled();

        await service.gatewayDown(identity);
        expect(gateways.update).toHaveBeenLastCalledWith({ connected: false, lastSeen: expect.any(Date) }, "gw-1");
    });

    it("área da borda: vira a área do cenário do gateway (mm) e avisa o front", async () => {
        const scenario = await service.saveArena(identity, view);

        expect(scenarios.applyEdgeArea).toHaveBeenCalledWith("gw-1", "Mapa lab-borda · mari · 1200", {
            sizeX: 1200, sizeY: 1200, areaSource: "lh2", areaLayout: "area", areaX: 1000, areaY: 1000,
            calibrationX: 1200, calibrationY: 1200, calibrationWidth: 800, calibrationHeight: 800,
            calibrationChannels: [13], calibrationVersion: view.version, calibrationFile: view.file,
        });
        expect(events.emit).toHaveBeenCalledWith(EventsCommands.scenarioUpdated, { scenario });
    });

    it("mesma área de novo (reconexão): o cenário não muda e ninguém é avisado", async () => {
        scenarios.applyEdgeArea.mockResolvedValue(null);

        expect(await service.saveArena(identity, view)).toBeNull();
        expect(events.emit).not.toHaveBeenCalled();
    });

    it("área desconhecida (borda sem calibração): não mexe no cenário", async () => {
        expect(await service.saveArena(identity, { ...view, source: null, layout: null, area: null })).toBeNull();
        expect(scenarios.applyEdgeArea).not.toHaveBeenCalled();
    });

    it("área do .env (sem LH2): sem calibração e arredondada para mm", async () => {
        await service.saveArena(identity, { ...view, source: "config", layout: "config", area: { x: 0, y: 0, width: 2000.4, height: 1499.6 }, calibration: null, channels: null, version: null, file: null });
        expect(scenarios.applyEdgeArea).toHaveBeenCalledWith("gw-1", expect.any(String), expect.objectContaining({
            areaSource: "config", sizeX: 2000, sizeY: 1500, calibrationX: null, calibrationChannels: null,
        }));
    });

    it("getScenario: o cenário do gateway; 404 sem gateway", async () => {
        scenarios.getByGateway.mockResolvedValue({ uuid: "sc-1" });
        await expect(service.getScenario("gw-1")).resolves.toEqual({ uuid: "sc-1" });

        gateways.exists.mockResolvedValue(false);
        await expect(service.getScenario("gw-x")).rejects.toThrow(NotFoundException);
    });
});

describe("EdgeGateway.identityOf (handshake do /edge)", () => {
    it("aceita mode válido e networkId em 4 hex (normaliza a caixa)", () => {
        expect(EdgeGateway.identityOf({ token: "t", mode: "mari", networkId: "12ab" }, "lab-borda"))
            .toEqual({ edgeId: "lab-borda", mode: GatewayMode.Mari, networkId: "12AB" });
    });

    it("borda antiga (sem mode/networkId) ou valores inválidos: sem identidade", () => {
        expect(EdgeGateway.identityOf({ token: "t" }, "lab-borda")).toBeNull();
        expect(EdgeGateway.identityOf({ mode: "wifi", networkId: "1200" }, "lab-borda")).toBeNull();
        expect(EdgeGateway.identityOf({ mode: "mqtt", networkId: "12000" }, "lab-borda")).toBeNull();
    });
});

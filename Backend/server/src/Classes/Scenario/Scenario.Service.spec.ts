import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ScenarioAreaFields, ScenarioService } from "./Scenario.Service";
import { ScenarioRepository } from "./Scenario.Repository";

/**
 * Teste unitário do ScenarioService.applyEdgeArea: o cenário de cada gateway
 * nasce e tem a área atualizada pela borda; o resto é do usuário.
 */
describe("ScenarioService (cenário do gateway)", () => {
    let service: ScenarioService;

    const fields: ScenarioAreaFields = {
        sizeX: 1200, sizeY: 1200, areaSource: "lh2", areaLayout: "area", areaX: 1000, areaY: 1000,
        calibrationX: 1200, calibrationY: 1200, calibrationWidth: 800, calibrationHeight: 800,
        calibrationChannels: [13], calibrationVersion: "2026-11-28T12:00:00.000Z", calibrationFile: "/x/calibration.toml",
    };
    const existing = { uuid: "sc-1", gatewayId: "gw-1", name: "Sala do lab", description: "editado", obstacles: [{ name: "Caixa" }], ...fields };

    const repository = { getByGateway: jest.fn(), insert: jest.fn(), update: jest.fn(), get: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();
        repository.getByGateway.mockResolvedValue(null);
        repository.insert.mockResolvedValue({ uuid: "sc-new" });
        repository.get.mockImplementation(async (uuid) => ({ uuid }));

        const moduleRef = await Test.createTestingModule({
            providers: [ScenarioService, { provide: ScenarioRepository, useValue: repository }],
        }).compile();

        service = moduleRef.get(ScenarioService);
    });

    it("primeira área do gateway: cria o cenário com o nome padrão", async () => {
        const scenario = await service.applyEdgeArea("gw-1", "Mapa lab-borda · mari · 1200", fields);

        expect(repository.insert).toHaveBeenCalledWith({
            name: "Mapa lab-borda · mari · 1200", description: "Mapa criado pela borda", gatewayId: "gw-1", ...fields,
        });
        expect(scenario).toEqual({ uuid: "sc-new" });
    });

    it("mesma área: nada muda", async () => {
        repository.getByGateway.mockResolvedValue(existing);

        expect(await service.applyEdgeArea("gw-1", "x", { ...fields, calibrationChannels: [13] })).toBeNull();
        expect(repository.update).not.toHaveBeenCalled();
        expect(repository.insert).not.toHaveBeenCalled();
    });

    it("área diferente (recalibrou): atualiza só a área - nome, descrição e obstáculos ficam", async () => {
        repository.getByGateway.mockResolvedValue(existing);
        const next = { ...fields, sizeX: 1500, calibrationVersion: "2026-11-29T10:00:00.000Z" };

        await service.applyEdgeArea("gw-1", "x", next);

        expect(repository.update).toHaveBeenCalledWith(next, "sc-1");
        const [dto] = repository.update.mock.calls[0];
        expect(dto).not.toHaveProperty("name");
        expect(dto).not.toHaveProperty("obstacles");
    });

    it("getByGateway: 404 enquanto a borda não mandou área", async () => {
        await expect(service.getByGateway("gw-1")).rejects.toThrow(NotFoundException);
        repository.getByGateway.mockResolvedValue(existing);
        await expect(service.getByGateway("gw-1")).resolves.toBe(existing);
    });
});

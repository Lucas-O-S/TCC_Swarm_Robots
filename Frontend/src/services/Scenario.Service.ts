import { DEFAULT_COLS, DEFAULT_ROWS } from '../Consts/MapConsts';
import { scenarioCreateRequestSchema } from '../dto/scenario.create.dto';
import { scenarioUpdateRequestSchema } from '../dto/scenario.update.dto';
import { ScenarioMapper } from '../mapper/Scenario.Mapper';
import type { MapModel } from '../model/Map.Model';
import type { ScenarioModel } from '../model/Scenario.Model';
import { ScenarioRepository } from '../repository/ScenarioRepository';
import { fromList, fromUnit, fromVoid, parseRequest } from './ServiceResult';
import type { ServiceResult } from './ServiceResult';

/**
 * Cenários: CRUD completo (`/scenarios`). Os obstáculos viajam dentro do
 * cenário. Todo método de escrita valida antes (`parseRequest`): inválido =
 * nenhuma chamada de rede.
 */
export const ScenarioService = {
  /** Cenário em branco, ainda não salvo (`uuid: null`) — só em memória. */
  createBlankMap(): MapModel {
    return {
      scenario: {
        uuid: null,
        sizeX: DEFAULT_COLS,
        sizeY: DEFAULT_ROWS,
        name: '',
        description: '',
        obstacles: [],
      },
      robots: [],
    };
  },


  /**
   * Mapa fixo (sem persistência) usado pelo Visualizador, pela Simulação e pelo
   * TaskBuilder para testar fluxos sem depender do banco. Vem do antigo
   * `CenarioService.createMockMap` (dev-front), já no modelo novo
   * (`scenario`, `obstacles`, `uuid: null`).
   */
  createMockMap(): MapModel {
    return {
      scenario: {
        uuid: null,
        sizeX: 12,
        sizeY: 10,
        name: 'Mapa de teste (mock)',
        description: 'Mapa fixo sem persistência — só pra testar a tela sem o banco.',
        obstacles: [
          { id: crypto.randomUUID(), name: 'Obstáculo 1', description: '', sizeX: 2, sizeY: 2, startPointX: 3, startPointY: 2, scenarioId: '' },
          { id: crypto.randomUUID(), name: 'Obstáculo 2', description: '', sizeX: 3, sizeY: 1, startPointX: 6, startPointY: 6, scenarioId: '' },
        ],
      },
      robots: [],
    };
  },

  /** Envolve um cenário carregado no formato de mapa usado pelas telas. */
  toMap(scenario: ScenarioModel): MapModel {
    return { scenario, robots: [] };
  },

  async list(): Promise<ServiceResult<ScenarioModel[]>> {
    return fromList(await ScenarioRepository.findAll(), ScenarioMapper.fromDto);
  },

  async getByUuid(uuid: string): Promise<ServiceResult<ScenarioModel>> {
    return fromUnit(await ScenarioRepository.findByUuid(uuid), ScenarioMapper.fromDto);
  },

  async create(model: ScenarioModel): Promise<ServiceResult<ScenarioModel>> {
    const body = parseRequest(scenarioCreateRequestSchema, ScenarioMapper.toCreateDto(model));
    if (!body.ok) return body;
    return fromUnit(await ScenarioRepository.create(body.data), ScenarioMapper.fromDto);
  },

  async update(uuid: string, model: ScenarioModel): Promise<ServiceResult<ScenarioModel>> {
    const body = parseRequest(scenarioUpdateRequestSchema, ScenarioMapper.toUpdateDto(model));
    if (!body.ok) return body;
    return fromUnit(await ScenarioRepository.update(uuid, body.data), ScenarioMapper.fromDto);
  },

  /** Botão "Salvar": cria se ainda não tem `uuid`, se não atualiza. */
  async save(model: ScenarioModel): Promise<ServiceResult<ScenarioModel>> {
    return model.uuid ? ScenarioService.update(model.uuid, model) : ScenarioService.create(model);
  },

  async remove(uuid: string): Promise<ServiceResult<void>> {
    return fromVoid(await ScenarioRepository.remove(uuid));
  },
};
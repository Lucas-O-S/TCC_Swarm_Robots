import { DEFAULT_COLS, DEFAULT_ROWS } from '../Consts/MapConsts';
import { scenarioCreateRequestSchema } from '../dto/scenario.create.dto';
import { scenarioUpdateRequestSchema } from '../dto/scenario.update.dto';
import { ScenarioMapper } from '../mapper/Scenario.Mapper';
import type { MapModel } from '../model/Map.Model';
import type { ScenarioModel } from '../model/Scenario.Model';
import { ScenarioRepository } from '../repository/ScenarioRepository';
import {
  fromList,
  fromUnit,
  fromVoid,
  parseRequest,
} from './ServiceResult';
import type { ServiceResult } from './ServiceResult';

export const ScenarioService = {
  /**
   * Cria um mapa em branco, ainda não salvo.
   * O uuid permanece null até a primeira persistência.
   */
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
   * Converte um cenário carregado para o formato de mapa
   * utilizado pelas telas.
   */
  toMap(scenario: ScenarioModel): MapModel {
    return {
      scenario,
      robots: [],
    };
  },

  /**
   * Cria um mapa de teste sem persistência.
   * Útil para testar as telas enquanto a integração com
   * o banco de dados não estiver disponível.
   */
  createMockMap(): MapModel {
    return {
      scenario: {
        uuid: null,
        sizeX: 12,
        sizeY: 10,
        name: 'Mapa de teste (mock)',
        description:
          'Mapa fixo sem persistência — só para testar a tela.',
        obstacles: [
          {
            id: crypto.randomUUID(),
            name: 'Obstáculo 1',
            description: '',
            sizeX: 2,
            sizeY: 2,
            obstacles: true,
            startPointX: 3,
            startPointY: 2,
            scenarioId: '',
          },
          {
            id: crypto.randomUUID(),
            name: 'Obstáculo 2',
            description: '',
            sizeX: 3,
            sizeY: 1,
            obstacles: true,
            startPointX: 6,
            startPointY: 6,
            scenarioId: '',
          },
        ],
      },
      robots: [],
    };
  },

  /**
   * Lista todos os cenários salvos.
   */
  async list(): Promise<ServiceResult<ScenarioModel[]>> {
    return fromList(
      await ScenarioRepository.findAll(),
      ScenarioMapper.fromDto,
    );
  },

  /**
   * Busca um cenário pelo UUID.
   */
  async getByUuid(
    uuid: string,
  ): Promise<ServiceResult<ScenarioModel>> {
    return fromUnit(
      await ScenarioRepository.findByUuid(uuid),
      ScenarioMapper.fromDto,
    );
  },

  /**
   * Cria um cenário após validar os dados.
   */
  async create(
    model: ScenarioModel,
  ): Promise<ServiceResult<ScenarioModel>> {
    const body = parseRequest(
      scenarioCreateRequestSchema,
      ScenarioMapper.toCreateDto(model),
    );

    if (!body.ok) return body;

    return fromUnit(
      await ScenarioRepository.create(body.data),
      ScenarioMapper.fromDto,
    );
  },

  /**
   * Atualiza um cenário existente após validar os dados.
   */
  async update(
    uuid: string,
    model: ScenarioModel,
  ): Promise<ServiceResult<ScenarioModel>> {
    const body = parseRequest(
      scenarioUpdateRequestSchema,
      ScenarioMapper.toUpdateDto(model),
    );

    if (!body.ok) return body;

    return fromUnit(
      await ScenarioRepository.update(uuid, body.data),
      ScenarioMapper.fromDto,
    );
  },

  /**
   * Salva um cenário:
   * - Sem UUID: cria um novo.
   * - Com UUID: atualiza o existente.
   */
  async save(
    model: ScenarioModel,
  ): Promise<ServiceResult<ScenarioModel>> {
    return model.uuid
      ? ScenarioService.update(model.uuid, model)
      : ScenarioService.create(model);
  },

  /**
   * Remove um cenário salvo.
   */
  async remove(uuid: string): Promise<ServiceResult<void>> {
    return fromVoid(
      await ScenarioRepository.remove(uuid),
    );
  },
};
import { MM_PER_CELL } from '../Consts/MapConsts';
import type { ObstacleDto } from '../dto/obstacle.dto';
import type { ScenarioDto } from '../dto/scenario.dto';
import type { ScenarioCreateRequest } from '../dto/scenario.create.dto';
import type { ScenarioUpdateRequest } from '../dto/scenario.update.dto';
import type { ObstacleModel } from '../model/Obstacle.Model';
import type { ScenarioModel } from '../model/Scenario.Model';

/**
 * O backend guarda tudo em **milímetros**; as telas desenham em **células**
 * (1 célula = `MM_PER_CELL` mm). Células -> mm é exato; mm -> células arredonda
 * para a célula mais próxima (tamanhos nunca abaixo de 1 célula), então um
 * cenário criado AQUI sobrevive ao vai-e-volta sem perda. Valores em mm que
 * não são múltiplos da célula (criados por outro cliente) são ajustados.
 */
const mmToCells = (mm: number) => Math.round(mm / MM_PER_CELL);
const mmToSizeCells = (mm: number) => Math.max(1, mmToCells(mm));
const cellsToMm = (cells: number) => Math.round(cells) * MM_PER_CELL;

export const ScenarioMapper = {
  obstacleFromDto(dto: ObstacleDto): ObstacleModel {
    return {
      id: dto.uuid,
      name: dto.name,
      description: dto.description ?? '',
      sizeX: mmToSizeCells(dto.sizeX),
      sizeY: mmToSizeCells(dto.sizeY),
      startPointX: mmToCells(dto.startPointX),
      startPointY: mmToCells(dto.startPointY),
      scenarioId: dto.scenarioId,
    };
  },

  fromDto(dto: ScenarioDto): ScenarioModel {
    return {
      uuid: dto.uuid,
      name: dto.name,
      description: dto.description ?? '',
      sizeX: mmToSizeCells(dto.sizeX),
      sizeY: mmToSizeCells(dto.sizeY),
      obstacles: (dto.obstacles ?? []).map(ScenarioMapper.obstacleFromDto),
    };
  },

  /** Corpo de `POST /scenarios`. `id`/`scenarioId`/`uuid` ficam de fora: o backend os gera. */
  toCreateDto(model: ScenarioModel): ScenarioCreateRequest {
    return {
      name: model.name.trim(),
      description: model.description,
      sizeX: cellsToMm(model.sizeX),
      sizeY: cellsToMm(model.sizeY),
      obstacles: model.obstacles.map((o) => ({
        name: o.name.trim(),
        description: o.description,
        sizeX: cellsToMm(o.sizeX),
        sizeY: cellsToMm(o.sizeY),
        startPointX: cellsToMm(o.startPointX),
        startPointY: cellsToMm(o.startPointY),
      })),
    };
  },

  /**
   * Corpo de `PUT /scenarios/:uuid`. Sempre manda `obstacles` (lista completa):
   * é assim que um obstáculo removido na tela também some no backend.
   */
  toUpdateDto(model: ScenarioModel): ScenarioUpdateRequest {
    return ScenarioMapper.toCreateDto(model);
  },
};
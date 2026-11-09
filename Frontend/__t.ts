import { SimulationService, SIMULATOR_DEFAULT_PRESET } from './src/services/Simulation.Service';
import { SimScenarioMapper } from './src/mapper/SimScenario.Mapper';
const ex = SimulationService.createPreset(SIMULATOR_DEFAULT_PRESET)!;
const map = SimScenarioMapper.toMap(ex, 'exemplo');
console.log(JSON.stringify({ sizeX: map.scenario.sizeX, sizeY: map.scenario.sizeY, obs: map.scenario.obstacles.map(o => [o.name, o.startPointX, o.startPointY, o.sizeX, o.sizeY]) }));
const back = SimScenarioMapper.fromMap(map);
console.log(JSON.stringify({ arena: back.arena, obstacles: back.obstacles }));
console.log(JSON.stringify({ sim: ex.arena, simObs: ex.obstacles }));

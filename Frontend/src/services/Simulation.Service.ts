import { CenarioService } from './Cenario.Service';
import { DEFAULT_COLS, DEFAULT_ROWS } from '../Consts/MapConsts';
import { CELL_MM, DEFAULT_NETWORK, DEFAULT_SIM_CONFIG, POINT_SNAP_MM, ROBOT_RADIUS_MM } from '../Consts/SimulationConsts';
import { DotBotControlMode } from '../enums/DotBotControlMode.enum';
import { TaskStatus } from '../enums/TaskStatus.enum';
import { ScenarioMapper } from '../mapper/Scenario.Mapper';
import type { ScenarioModel, ScenarioRobotModel } from '../model/Scenario.Model';
import type { SimObstacleModel, Vec2Model } from '../model/SimWorld.Model';
import type { TaskModel } from '../model/Task.Model';
import { collidesAny } from '../screens/Simulation/SimPhysics';

// Cenários que a tela de Simulação oferece sem banco de dados (a conexão com
// a API ainda não existe — mesmo espírito do CenarioService.createMockMap
// usado pelo TaskBuilder):
//   - os dois exemplos do RobotSwarmSimulator (scenarios/exemplo.json e
//     scenarios/enxame.json), copiados como estão — o formato é o mesmo, então
//     dá pra ir e voltar entre os dois projetos pelo Importar/Exportar;
//   - o mapa mock do Construtor de Cenários, convertido de células pra mm;
//   - um cenário em branco pra montar do zero no modo Editar.

const EXEMPLO: ScenarioModel = {
  version: 1,
  network: { ...DEFAULT_NETWORK },
  arena: { width_mm: 2000, height_mm: 2000, grid_mm: 100 },
  obstacles: [{ id: 'barreira-1', x_mm: 900, y_mm: 600, w_mm: 200, h_mm: 800 }],
  robots: [
    {
      address: 'BDF2B04BC00D2725',
      application: 0,
      mode: 1,
      start: { x_mm: 300, y_mm: 300, theta_deg: 0 },
      battery: 100,
      waypoints: [
        { x_mm: 1500, y_mm: 300 },
        { x_mm: 1500, y_mm: 1700 },
      ],
      waypoint_threshold_mm: 50,
    },
    { address: 'A1B2C3D4E5F60708', application: 0, mode: 0, start: { x_mm: 300, y_mm: 1000, theta_deg: 0 }, battery: 100 },
  ],
  sim: { ...DEFAULT_SIM_CONFIG },
};

const ENXAME: ScenarioModel = {
  version: 1,
  network: { ...DEFAULT_NETWORK },
  arena: { width_mm: 4000, height_mm: 4000, grid_mm: 200 },
  obstacles: [
    { id: 'muro-central', x_mm: 1800, y_mm: 1200, w_mm: 400, h_mm: 1600 },
    { id: 'caixa-ne', x_mm: 2800, y_mm: 3000, w_mm: 400, h_mm: 300 },
    { id: 'caixa-so', x_mm: 700, y_mm: 2500, w_mm: 600, h_mm: 250 },
  ],
  robots: [
    {
      address: '0A11CE0000000001',
      application: 0,
      mode: 1,
      start: { x_mm: 600, y_mm: 600, theta_deg: 0 },
      battery: 100,
      waypoints: [
        { x_mm: 3400, y_mm: 600 },
        { x_mm: 3400, y_mm: 3400 },
        { x_mm: 600, y_mm: 3400 },
        { x_mm: 600, y_mm: 600 },
      ],
      waypoint_threshold_mm: 60,
      loop: true,
    },
    {
      address: '0A11CE0000000002',
      application: 0,
      mode: 1,
      start: { x_mm: 1500, y_mm: 1000, theta_deg: 0 },
      battery: 100,
      waypoints: [
        { x_mm: 2500, y_mm: 1000 },
        { x_mm: 2500, y_mm: 3000 },
        { x_mm: 1500, y_mm: 3000 },
        { x_mm: 1500, y_mm: 1000 },
      ],
      waypoint_threshold_mm: 50,
      loop: true,
    },
    {
      address: '0A11CE0000000003',
      application: 0,
      mode: 1,
      start: { x_mm: 3600, y_mm: 2400, theta_deg: 270 },
      battery: 90,
      waypoints: [
        { x_mm: 3600, y_mm: 1200 },
        { x_mm: 2800, y_mm: 600 },
      ],
      waypoint_threshold_mm: 50,
    },
    {
      address: '0A11CE0000000004',
      application: 0,
      mode: 1,
      start: { x_mm: 400, y_mm: 1600, theta_deg: 90 },
      battery: 80,
      waypoints: [{ x_mm: 400, y_mm: 3000 }],
      waypoint_threshold_mm: 50,
    },
    { address: '0A11CE0000000005', application: 0, mode: 0, start: { x_mm: 3000, y_mm: 500, theta_deg: 90 }, battery: 100 },
    { address: '0A11CE0000000006', application: 0, mode: 0, start: { x_mm: 2000, y_mm: 3600, theta_deg: 0 }, battery: 40 },
  ],
  sim: { ...DEFAULT_SIM_CONFIG },
};

// Robôs do mapa mock (12×10 blocos = 2400×2000 mm; obstáculos em
// x 600–1000/y 1200–1600 e x 1200–1800/y 600–800): um contorna a arena em
// loop (a 300 mm das bordas, fora da legenda/controles do mapa), outro dá voltas entre os obstáculos e um fica em MANUAL pro joystick.
// As rotas não se cruzam de frente (dois robôs na mesma linha em sentidos
// opostos travam um no outro — a colisão entre robôs só separa, não desvia).
const MOCK_ROBOTS: ScenarioRobotModel[] = [
  {
    address: 'C0FFEE0000000001',
    application: 0,
    mode: DotBotControlMode.Auto,
    start: { x_mm: 300, y_mm: 300, theta_deg: 0 },
    battery: 100,
    waypoints: [
      { x_mm: 2100, y_mm: 300 },
      { x_mm: 2100, y_mm: 1700 },
      { x_mm: 300, y_mm: 1700 },
      { x_mm: 300, y_mm: 300 },
    ],
    waypoint_threshold_mm: 50,
    loop: true,
  },
  {
    address: 'C0FFEE0000000002',
    application: 0,
    mode: DotBotControlMode.Auto,
    start: { x_mm: 1100, y_mm: 1000, theta_deg: 0 },
    battery: 85,
    waypoints: [
      { x_mm: 1950, y_mm: 1000 },
      { x_mm: 1950, y_mm: 450 },
      { x_mm: 1100, y_mm: 450 },
      { x_mm: 1100, y_mm: 1000 },
    ],
    waypoint_threshold_mm: 50,
    loop: true,
  },
  {
    address: 'C0FFEE0000000003',
    application: 0,
    mode: DotBotControlMode.Manual,
    start: { x_mm: 400, y_mm: 1000, theta_deg: 90 },
    battery: 60,
  },
];

export interface ScenarioPreset {
  key: string;
  name: string;
  description: string;
}

const PRESETS: (ScenarioPreset & { build: () => ScenarioModel })[] = [
  {
    key: 'exemplo',
    name: 'exemplo',
    description: '2 robôs (1 em AUTO com rota, 1 em MANUAL) e uma barreira — o exemplo.json do RobotSwarmSimulator.',
    build: () => ScenarioMapper.clone(EXEMPLO),
  },
  {
    key: 'enxame',
    name: 'enxame',
    description: '6 robôs, rotas em loop, bateria variada e 3 obstáculos — o enxame.json do RobotSwarmSimulator.',
    build: () => ScenarioMapper.clone(ENXAME),
  },
  {
    key: 'mock',
    name: 'Mapa de teste (mock)',
    description: 'O mapa fixo do Construtor de Cenários (12×10 blocos, 2 obstáculos) com 3 robôs de exemplo.',
    build: () => ScenarioMapper.fromMap(CenarioService.createMockMap(), MOCK_ROBOTS),
  },
];

// Tasks mock — o que o GET /tasks devolveria (a tela de Simulação NÃO cria
// task, só puxa e seleciona; criar é da tela Tarefas/API). Como o cenário
// muda, as rotas são frações da arena; entra só a que dá pra percorrer em
// linha reta: todo ponto livre e nenhum trecho cortando barreira (o
// controlador AUTO não desvia de nada).
const MOCK_TASKS: { name: string; priority: number; points: [number, number][] }[] = [
  { name: 'Entrega doca → estoque', priority: 0, points: [[0.12, 0.12], [0.88, 0.12], [0.88, 0.5]] },
  { name: 'Inspeção canto nordeste', priority: 1, points: [[0.75, 0.75], [0.88, 0.88], [0.7, 0.88]] },
  { name: 'Coleta canto sudoeste', priority: 1, points: [[0.3, 0.3], [0.12, 0.3], [0.12, 0.12]] },
  { name: 'Patrulha do perímetro', priority: 2, points: [[0.12, 0.12], [0.88, 0.12], [0.88, 0.88], [0.12, 0.88], [0.12, 0.12]] },
  { name: 'Travessia norte', priority: 3, points: [[0.12, 0.88], [0.88, 0.88]] },
  { name: 'Ronda central', priority: 4, points: [[0.35, 0.5], [0.5, 0.35], [0.65, 0.5], [0.5, 0.65]] },
];

const MOCK_CLEARANCE_MM = ROBOT_RADIUS_MM + 20;

function segmentIsFree(a: Vec2Model, b: Vec2Model, obstacles: SimObstacleModel[]): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 20));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (collidesAny({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, MOCK_CLEARANCE_MM, obstacles)) return false;
  }
  return true;
}

function buildMockTasks(scenario: ScenarioModel): TaskModel[] {
  const { width_mm: w, height_mm: h } = scenario.arena;
  const obstacles: SimObstacleModel[] = scenario.obstacles.map((o) => ({ id: o.id, x: o.x_mm, y: o.y_mm, w: o.w_mm, h: o.h_mm }));
  const snap = (v: number, max: number) =>
    Math.min(max - MOCK_CLEARANCE_MM, Math.max(MOCK_CLEARANCE_MM, Math.round(v / POINT_SNAP_MM) * POINT_SNAP_MM));

  const tasks: TaskModel[] = [];
  for (const mock of MOCK_TASKS) {
    const points = mock.points.map(([fx, fy]) => ({ x: snap(fx * w, w), y: snap(fy * h, h) }));
    const free = points.every((p, i) => !collidesAny(p, MOCK_CLEARANCE_MM, obstacles) && (i === 0 || segmentIsFree(points[i - 1], p, obstacles)));
    if (!free) continue;
    tasks.push({
      uuid: `mock-task-${tasks.length + 1}`,
      name: mock.name,
      priority: mock.priority,
      status: TaskStatus.Pending,
      waypoints: points.map((p, orderIndex) => ({ orderIndex, x: p.x, y: p.y })),
      robots: [],
      isDeleted: false,
    });
  }
  return tasks;
}

export type ParseScenarioResult = { ok: true; scenario: ScenarioModel } | { ok: false; error: string };

export const SimulationService = {
  /** Cenários de exemplo disponíveis offline (nome + descrição, pro SelectSimulationScenarioModal). */
  listPresets(): ScenarioPreset[] {
    return PRESETS.map(({ key, name, description }) => ({ key, name, description }));
  },

  /** Cópia nova do cenário de exemplo `key`, ou null se não existir. */
  createPreset(key: string): ScenarioModel | null {
    return PRESETS.find((p) => p.key === key)?.build() ?? null;
  },

  /** Cenário vazio do tamanho padrão do grid do app (16×16 blocos). */
  createBlank(cols = DEFAULT_COLS, rows = DEFAULT_ROWS): ScenarioModel {
    return {
      version: 1,
      network: { ...DEFAULT_NETWORK },
      arena: { width_mm: cols * CELL_MM, height_mm: rows * CELL_MM, grid_mm: CELL_MM },
      obstacles: [],
      robots: [],
      sim: { ...DEFAULT_SIM_CONFIG },
    };
  },

  /**
   * Tasks mock pro cenário (todas Pending, rotas que cabem nele). Quando a
   * API existir, isto vira o `TaskService.list()`.
   */
  createMockTasks(scenario: ScenarioModel): TaskModel[] {
    return buildMockTasks(scenario);
  },

  /**
   * Texto de um .json (mesmo schema do RobotSwarmSimulator) → cenário
   * validado e canônico (mesma validação do ScenarioMapper.toWorld; normaliza
   * address pra maiúsculas e descarta campos desconhecidos).
   */
  parseFile(text: string): ParseScenarioResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: 'O arquivo não é um JSON válido.' };
    }
    try {
      return { ok: true, scenario: ScenarioMapper.fromWorld(ScenarioMapper.toWorld(parsed as ScenarioModel)) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};

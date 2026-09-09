import { RobotStatus } from '../../enums/RobotStatus.enum';
import { Card } from '../../components/Card/Card';
import { Robot } from '../../components/Robot/RobotProp';
import { Obstacle } from '../../components/Obstacle/Obstacle';
import { MapCanvas } from '../../components/MapCanvas/MapCanvas';
import type { MapModel } from '../../model/Map.Model';
import styles from './MapTestScreen.module.css';

const CELL_SIZE = 32;

// Mock de CenarioModel — sizeX/sizeY definem o grid (em células) e cada
// item de Obstacles.startPointX/startPointY + sizeX/sizeY posiciona e
// dimensiona um obstáculo dentro dele.
const MOCK_MAP: MapModel = {
  cenario: {
    name: 'Cenário de teste',
    description: 'Mock local só pra validar Map + Obstacle',
    sizeX: 10,
    sizeY: 8,
    obstacles: true,
    Obstacles: [
      {
        name: 'Parede 1',
        description: 'Obstáculo mock',
        sizeX: 2,
        sizeY: 1,
        obstacles: true,
        startPointX: 3,
        startPointY: 3,
        cenarioId: 'mock-cenario',
      },
      {
        name: 'Parede 2',
        description: 'Obstáculo mock',
        sizeX: 1,
        sizeY: 3,
        obstacles: true,
        startPointX: 7,
        startPointY: 1,
        cenarioId: 'mock-cenario',
      },
    ],
  },
  robots: [],
};

// Mock local só pra esta tela — RobotModel (src/model/Robot.Model.ts) não
// tem posição (o backend real ainda não expõe coordenada de robô), então
// aqui a posição é inventada (col/row no grid) só pra validar visualmente
// <Map> + <Robot> juntos.
interface MockRobot {
  id: string;
  label: string;
  status: RobotStatus;
  col: number;
  row: number;
  /** Graus, 0° = pra cima — mesma convenção do `theta` do simulador. */
  direction: number;
}

const MOCK_ROBOTS: MockRobot[] = [
  { id: '1', label: 'R01', status: RobotStatus.Active, col: 2, row: 1, direction: 0 },
  { id: '2', label: 'R02', status: RobotStatus.Active, col: 5, row: 4, direction: 90 },
  { id: '3', label: 'R03', status: RobotStatus.Inactive, col: 9, row: 2, direction: 180 },
  { id: '4', label: 'R04', status: RobotStatus.Lost, col: 9, row: 6, direction: 270 },
];

// Tela isolada só pra visualizar <Map> + <Robot> com dados mockados,
// sem depender de API/hooks reais. Não faz parte do fluxo do produto.
export function MapTestScreen() {
  return (
    <Card className={styles.card}>
      <h1 className={styles.title}>Teste: Map + Robot (mock)</h1>

      <MapCanvas cols={MOCK_MAP.cenario.sizeX} rows={MOCK_MAP.cenario.sizeY} cellSize={CELL_SIZE}>
        {MOCK_MAP.cenario.Obstacles.map((obstacle) => (
          <Obstacle
            key={obstacle.name}
            label={obstacle.name}
            width={obstacle.sizeX * CELL_SIZE}
            height={obstacle.sizeY * CELL_SIZE}
            style={{
              position: 'absolute',
              left: obstacle.startPointX * CELL_SIZE,
              top: obstacle.startPointY * CELL_SIZE,
            }}
          />
        ))}
        {MOCK_ROBOTS.map((robot) => (
          <Robot
            key={robot.id}
            label={robot.label}
            status={robot.status}
            direction={robot.direction}
            style={{
              position: 'absolute',
              left: robot.col * CELL_SIZE + CELL_SIZE / 2,
              top: robot.row * CELL_SIZE + CELL_SIZE / 2,
            }}
          />
        ))}
      </MapCanvas>
    </Card>
  );
}

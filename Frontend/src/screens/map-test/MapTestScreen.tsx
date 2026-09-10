import { RobotStatus } from '../../enums/RobotStatus.enum';
import { Card } from '../../components/Card/Card';
import { Map } from '../../components/Map/Map';
import { Robot } from '../../components/Robot/RobotProp';
import styles from './MapTestScreen.module.css';

const CELL_SIZE = 32;

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
}

const MOCK_ROBOTS: MockRobot[] = [
  { id: '1', label: 'R01', status: RobotStatus.Active, col: 2, row: 1 },
  { id: '2', label: 'R02', status: RobotStatus.Active, col: 5, row: 4 },
  { id: '3', label: 'R03', status: RobotStatus.Inactive, col: 9, row: 2 },
  { id: '4', label: 'R04', status: RobotStatus.Lost, col: 9, row: 6 },
];

// Tela isolada só pra visualizar <Map> + <Robot> com dados mockados,
// sem depender de API/hooks reais. Não faz parte do fluxo do produto.
export function MapTestScreen() {
  return (
    <Card className={styles.card}>
      <h1 className={styles.title}>Teste: Map + Robot (mock)</h1>

      <Map cols={10} rows={8} cellSize={CELL_SIZE}>
        {MOCK_ROBOTS.map((robot) => (
          <Robot
            key={robot.id}
            label={robot.label}
            status={robot.status}
            style={{
              position: 'absolute',
              left: robot.col * CELL_SIZE + CELL_SIZE / 2,
              top: robot.row * CELL_SIZE + CELL_SIZE / 2,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </Map>
    </Card>
  );
}

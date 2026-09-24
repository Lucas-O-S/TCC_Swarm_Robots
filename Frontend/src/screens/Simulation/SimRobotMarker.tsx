import { useMapElement } from '../../hooks/useMapElements';
import { Robot, ROBOT_SIZE } from '../../components/Robot/RobotProp';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import type { SimMapRobotModel } from '../../model/SimRobot.Model';
import type { MapScale } from './useMapGeometry';
import { fromPx, thetaToDirection, toPx } from './useMapGeometry';
import { robotSelId } from './useSimSelection';
import styles from './SimulationMap.module.css';

interface SimRobotMarkerProps {
  robot: SimMapRobotModel;
  scale: MapScale;
  /** Modo Editar: arrastar move a pose inicial, Backspace/Delete remove. */
  editable: boolean;
  onMove: (address: string, pos: { x: number; y: number }) => void;
  onRemove: (address: string) => void;
}

// Robô no mapa da simulação — o <Robot> (só visual, também usado em listas)
// ganha seleção/arrasto/Delete via useMapElement, igual ao TaskRobot do
// TaskBuilder. Cor: a fixa do robô (a mesma do chip e da rota), ou a do LED
// quando um CMD_RGB_LED está aceso; fora da rede ou sem bateria fica
// esmaecido. Seta no rumo (theta). Quando está em cima de um waypoint o clique vai pro
// ponto (`hitPriority` menor), pra dar pra arrastar a rota sem pegar o robô.
export function SimRobotMarker({ robot, scale, editable, onMove, onRemove }: SimRobotMarkerProps) {
  const half = ROBOT_SIZE / 2;
  const center = toPx(scale, { x: robot.x, y: robot.y });
  const { selected, x: renderX, y: renderY } = useMapElement({
    id: robotSelId(robot.address),
    x: center.x - half,
    y: center.y - half,
    width: ROBOT_SIZE,
    height: ROBOT_SIZE,
    hitPriority: -1,
    movable: editable,
    onMove: (next) => onMove(robot.address, fromPx(scale, { x: next.x + half, y: next.y + half })),
    removable: editable,
    onRemove: () => onRemove(robot.address),
  });


  const fill = SimRobotMapper.displayColor(robot);

  return (
    <Robot
      label={robot.label}
      status={robot.status}
      direction={thetaToDirection(robot.theta)}
      selected={selected}
      className={`${editable ? styles.draggable : ''} ${robot.status !== RobotStatus.Active ? styles.robotOff : ''}`}
      title={`${robot.label} · ${robot.address}`}
      style={{
        position: 'absolute',
        left: renderX + half,
        top: renderY + half,
        background: fill,
        borderColor: fill,
      }}
    />
  );
}

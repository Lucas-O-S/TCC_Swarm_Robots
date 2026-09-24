import { useMapElement } from '../../hooks/useMapElements';
import { Robot } from '../../components/Robot/RobotProp';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import type { SimMapRobotModel } from '../../model/SimRobot.Model';
import type { MapScale } from './useMapGeometry';
import { fromPx, thetaToDirection, toPx } from './useMapGeometry';
import { robotSelId } from './useSimSelection';
import styles from './SimulationMap.module.css';

/** Mesmo diâmetro do marcador em Robot.module.css — área clicável/arrastável. */
const SIZE = 20;

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
// TaskBuilder. Cor pelo status (verde = na rede, cinza = fora dela, vermelho
// = sem bateria), anel na cor do LED quando um CMD_RGB_LED acendeu o robô e
// seta no rumo (theta). Quando está em cima de um waypoint o clique vai pro
// ponto (`hitPriority` menor), pra dar pra arrastar a rota sem pegar o robô.
export function SimRobotMarker({ robot, scale, editable, onMove, onRemove }: SimRobotMarkerProps) {
  const half = SIZE / 2;
  const center = toPx(scale, { x: robot.x, y: robot.y });
  const { selected, x: renderX, y: renderY } = useMapElement({
    id: robotSelId(robot.address),
    x: center.x - half,
    y: center.y - half,
    width: SIZE,
    height: SIZE,
    hitPriority: -1,
    movable: editable,
    onMove: (next) => onMove(robot.address, fromPx(scale, { x: next.x + half, y: next.y + half })),
    removable: editable,
    onRemove: () => onRemove(robot.address),
  });

  const led = robot.rgb && (robot.rgb.r || robot.rgb.g || robot.rgb.b) ? `rgb(${robot.rgb.r}, ${robot.rgb.g}, ${robot.rgb.b})` : null;

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
        ...(led ? { boxShadow: `0 0 0 3px ${led}, 0 0 8px 2px ${led}` } : null),
      }}
    />
  );
}

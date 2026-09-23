import { useMapElement } from "../../hooks/useMapElements";
import { Robot } from "../../components/Robot/RobotProp";
import { RobotStatus } from "../../enums/RobotStatus.enum";

/** Id fixo no registro de seleção do mapa — só existe 1 robô nesta tela. */
export const TASK_ROBOT_ID = "task-robot";

/** Mesmo diâmetro do marcador em Robot.module.css — área clicável/arrastável. */
const SIZE = 20;

interface TaskRobotProps {
  /** Centro do robô (px) dentro do mapa. */
  x: number;
  y: number;
  /** Graus, 0° = pra cima, sentido horário (ver <Robot direction>). Sem, não desenha a seta. */
  direction?: number;
  onMove: (next: { x: number; y: number }) => void;
  onRemove: () => void;
  className?: string;
}

// Robô posicionado no TaskBuilder — o <Robot> é só visual (também é usado
// fora do mapa, em listas/cartões, então não pode chamar useMapElement), aqui
// ele ganha seleção/arrasto/Delete igual o <Waypoint>, com x/y no centro.
// Nunca é mexido junto com os waypoints: fica fora de seleção múltipla
// (`solo`) e, quando está em cima de um ponto (ex.: parou no último da
// rota), o clique vai pro ponto (`hitPriority` menor) — arrastar o waypoint
// não arrasta o robô.
export function TaskRobot({ x, y, direction, onMove, onRemove, className }: TaskRobotProps) {
  const half = SIZE / 2;
  const { selected, x: renderX, y: renderY } = useMapElement({
    id: TASK_ROBOT_ID,
    x: x - half,
    y: y - half,
    width: SIZE,
    height: SIZE,
    solo: true,
    hitPriority: -1,
    movable: true,
    onMove: (next) => onMove({ x: next.x + half, y: next.y + half }),
    removable: true,
    onRemove,
  });

  return (
    <Robot
      label="R"
      status={RobotStatus.Active}
      direction={direction}
      selected={selected}
      className={className}
      style={{ position: "absolute", left: renderX + half, top: renderY + half }}
    />
  );
}

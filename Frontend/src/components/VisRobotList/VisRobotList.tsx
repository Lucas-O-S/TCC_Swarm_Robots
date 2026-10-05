import { Badge } from '../Badge/Badge';
import { RobotStatusBadge, RobotTaskBadge } from '../RobotCard/RobotCard';
import type { RobotCardData } from '../RobotCard/RobotCard';
import { RobotList } from '../RobotList/RobotList';
import { StatusSep } from '../StatusLine/StatusLine';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import type { VisRobotRowModel } from '../../model/VisRobot.Model';

interface VisRobotListProps {
  robots: VisRobotRowModel[];
  connected: boolean;
}

// Lista de robôs do Visualizador: o RobotList com os cartões montados a
// partir do que a API informa — status calculado pelo backend, modo de
// orquestração, tarefa, pose e bateria do último advertisement.
export function VisRobotList({ robots, connected }: VisRobotListProps) {
  return (
    <RobotList
      summary={
        <>
          {connected ? 'ao vivo' : 'sem conexão'}
          <StatusSep />
          API: {SimRobotMapper.statusSummary(robots.map((r) => r.status))}
        </>
      }
      summaryTone={connected ? 'on' : 'off'}
      hint={
        robots.length > 0
          ? 'Clique num robô pra ver a telemetria e mandar comandos.'
          : connected
            ? 'Nenhum robô cadastrado na API ainda — eles aparecem sozinhos no primeiro DOTBOT_ADVERTISEMENT.'
            : 'Sem robôs: o visualizador só mostra os que vêm da API, e ela está sem conexão.'
      }
      robots={robots.map(toCard)}
    />
  );
}

function toCard(robot: VisRobotRowModel): RobotCardData {
  const battery = Math.max(0, Math.min(100, robot.battery));
  return {
    address: robot.address,
    label: robot.label,
    color: robot.color,
    addressTitle: `${robot.name} · ${robot.address}`,
    modeLabel: robot.modeLabel,
    modeTitle: 'Modo de orquestração (coluna mode da API)',
    badges: (
      <>
        <RobotStatusBadge status={robot.status} />
        {robot.taskName && <RobotTaskBadge name={robot.taskName} />}
        {robot.outside && (
          <Badge tone="yellow" title="A posição do robô está fora da arena do cenário escolhido — o marcador fica na borda">
            fora do mapa
          </Badge>
        )}
      </>
    ),
    pose: robot.pose
      ? `x=${robot.pose.x.toFixed(0)} y=${robot.pose.y.toFixed(0)} · ${robot.pose.thetaDeg.toFixed(0)}°`
      : robot.wireAuto === null
        ? 'sem telemetria'
        : 'sem localização',
    battery,
    batteryText: `${Math.round(battery)}%`,
    routeText: robot.wireAuto === null ? '—' : robot.wireAuto ? `rota · wp ${robot.waypointIdx ?? 0}` : 'sem rota',
    routeTitle: 'Modo no fio (último advertisement)',
  };
}

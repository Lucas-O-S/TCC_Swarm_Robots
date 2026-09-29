import { Badge } from '../Badge/Badge';
import { RobotStatusBadge, RobotTaskBadge } from '../RobotCard/RobotCard';
import type { RobotCardData } from '../RobotCard/RobotCard';
import { RobotList } from '../RobotList/RobotList';
import { StatusSep } from '../StatusLine/StatusLine';
import { SwarmitDeviceStatus } from '../../enums/SwarmitDeviceStatus.enum';
import { swarmitStatusName } from '../../Integration/Protocols/Swarmit/Swarmit.Protocol';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import type { SimRobotRowModel } from '../../model/SimRobot.Model';

interface SimRobotListProps {
  robots: SimRobotRowModel[];
  editing: boolean;
}

// Lista de robôs da Simulação: o RobotList com os cartões montados a partir
// do que o simulador e o backend local sabem (mesmos campos do Inspector do
// RobotSwarmSimulator + rede Mari, swarmit e status na API).
export function SimRobotList({ robots, editing }: SimRobotListProps) {
  const sim = robots.filter((r) => r.sim);
  const online = sim.filter((r) => r.sim?.online).length;

  return (
    <RobotList
      summary={
        editing ? undefined : (
          <>
            {online}/{robots.length} na rede
            <StatusSep />
            API: {SimRobotMapper.statusSummary(sim.map((r) => r.sim?.backendStatus ?? null))}
          </>
        )
      }
      summaryTone={online === robots.length ? 'on' : 'warn'}
      hint={
        editing
          ? robots.length === 0
            ? 'Nenhum robô — use a ferramenta Robô no canto do mapa e clique numa célula livre.'
            : 'Clique num robô pra editar endereço, modo, bateria, rumo, LED e rota.'
          : undefined
      }
      robots={robots.map(toCard)}
    />
  );
}

function toCard(robot: SimRobotRowModel): RobotCardData {
  const { sim } = robot;
  const battery = Math.max(0, Math.min(100, robot.battery));
  return {
    address: robot.address,
    label: robot.label,
    color: robot.color,
    modeLabel: robot.modeLabel,
    badges: sim && (
      <>
        <Badge tone={sim.online ? 'green' : 'red'} title="Estado na rede Mari (lado do simulador)">
          {sim.online ? 'ONLINE' : 'OFFLINE'}
        </Badge>
        {sim.swarmitStatus !== null && (
          <Badge tone={sim.swarmitStatus === SwarmitDeviceStatus.Running ? 'dark' : 'blue'} title="Estado swarmit do dispositivo">
            {swarmitStatusName(sim.swarmitStatus)}
          </Badge>
        )}
        <RobotStatusBadge status={sim.backendStatus} />
        {sim.taskName && <RobotTaskBadge name={sim.taskName} />}
      </>
    ),
    pose: `x=${robot.x.toFixed(0)} y=${robot.y.toFixed(0)} · ${robot.thetaDeg.toFixed(0)}°`,
    battery,
    batteryText: `${battery.toFixed(1)}%`,
    routeText:
      robot.waypoints > 0
        ? `rota ${robot.waypointIdx !== null ? `${Math.min(robot.waypointIdx, robot.waypoints)}/` : ''}${robot.waypoints}${robot.loop ? ' ⟳' : ''}`
        : 'sem rota',
  };
}

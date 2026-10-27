import { MM_PER_CELL } from '../../Consts/MapConsts';
import { PositionSource } from '../../enums/PositionSource.enum';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import type { PositionModel } from '../../model/Position.Model';
import type { RobotModel } from '../../model/Robot.Model';
import type { ConnectionLogEntry, RobotConnection } from './types';

/** Última amostra de posição LH2 de cada robô (chave = `robotId`, o uuid do robô). */
export function latestPositionByRobot(positions: PositionModel[]): Map<string, PositionModel> {
  const latest = new Map<string, PositionModel>();
  for (const position of positions) {
    if (position.isDeleted || position.source !== PositionSource.LH2) continue;
    const current = latest.get(position.robotId);
    if (!current || position.createdAt > current.createdAt) latest.set(position.robotId, position);
  }
  return latest;
}

/** Milímetros -> índice de célula, preso dentro do grid (0..max-1). */
export function mmToCell(mm: number, max: number): number {
  const cell = Math.floor(mm / MM_PER_CELL);
  return Math.min(Math.max(cell, 0), max - 1);
}

/**
 * Junta robôs + posições no formato da tela. Só `Active` conta como online
 * (o backend recalcula o status pelo tempo de silêncio: Inactive/Lost = sem sinal).
 */
export function toRobotConnections(
  robots: RobotModel[],
  positions: PositionModel[],
  gridCols: number,
  gridRows: number,
): RobotConnection[] {
  const latest = latestPositionByRobot(positions);
  return robots
    .filter((robot) => !robot.isDeleted)
    .map((robot) => {
      const position = latest.get(robot.uuid);
      return {
        id: robot.uuid,
        label: robot.name,
        col: position ? mmToCell(position.x, gridCols) : null,
        row: position ? mmToCell(position.y, gridRows) : null,
        status: robot.status === RobotStatus.Active ? 'online' : 'offline',
      };
    });
}

/** Uma linha de aviso para cada robô sem sinal. */
export function toConnectionLog(robots: RobotConnection[]): ConnectionLogEntry[] {
  return robots
    .filter((robot) => robot.status === 'offline')
    .map((robot) => ({ id: `offline-${robot.id}`, message: `⚠ ${robot.label} está sem conexão` }));
}
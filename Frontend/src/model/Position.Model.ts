import type { PositionSource } from '../enums/PositionSource.enum';

/**
 * Amostra do histórico de posição de um robô. `x`/`y` dependem de `source`:
 * LH2 = milímetros; GPS = latitude (x) e longitude (y) em graus decimais.
 */
export interface PositionModel {
  uuid: string;
  robotId: string;
  source: PositionSource;
  x: number;
  y: number;
  /** `null` quando o robô não reportou direção naquela amostra. */
  direction: number | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface PositionInput {
  robotId: string;
  source?: PositionSource;
  x: number;
  y: number;
  direction?: number;
}

export type PositionUpdateInput = Partial<PositionInput>;

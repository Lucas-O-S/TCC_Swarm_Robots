/**
 * Último frame decodificado que chegou do robô, guardado em memória no
 * backend (`GET /robots/:address/status`). `data` depende de `payloadType`.
 */
export interface RobotStateModel {
  payloadType: number;
  data: Record<string, unknown>;
  updatedAt: Date;
}

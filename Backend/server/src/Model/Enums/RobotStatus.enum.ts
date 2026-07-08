/**
 * DotBotStatus. Diferente de RobotApplication/RobotControlMode, este valor
 * NUNCA é transmitido pelo robô - é calculado pelo backend a partir de
 * `lastSync` (ACTIVE < 5s, INACTIVE < 60s, LOST caso contrário), igual ao
 * `_dotbots_status_refresh` do PyDotBot. Por isso fica no domínio/model,
 * não no módulo de Protocolo.
 */
export enum RobotStatus {
    Active = 0,
    Inactive = 1,
    Lost = 2,
}

/**
 * ControlModeType do protocolo DotBot (dotbot/protocol.py).
 *
 * Também trafega no payload (PayloadControlMode / campo `mode` do
 * advertisement), então fica no módulo de Protocolo pelo mesmo motivo do
 * RobotApplication.
 */
export enum RobotControlMode {
    Manual = 0,
    Auto = 1,
}

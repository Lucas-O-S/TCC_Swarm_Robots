/**
 * Rótulo legível de cada comando que sai pro robô. É só o "nome" da ação (vai
 * no recibo/log e no 3º argumento do RobotService.sendCommand), não confundir
 * com o PayloadType (o byte do protocolo). Usar o enum evita string solta
 * digitada errada em cada rota.
 */
export enum Command {
    MoveRaw = "move-raw",
    RgbLed = "rgb-led",
    ControlMode = "control-mode",
    Waypoints = "waypoints",
    XgoAction = "xgo-action",
}

/**
 * Rótulo legível de cada comando que sai pro robô. É só o "nome" da ação (vai
 * no recibo/log e no 2º argumento do RobotService.sendCommand), não confundir
 * com o PayloadType (o byte do protocolo, que só a borda conhece). O valor
 * também é o último pedaço da rota de comando da borda
 * (POST /v1/robots/:address/commands/<comando>). Usar o enum evita string solta
 * digitada errada em cada rota.
 */
export enum Command {
    MoveRaw = "move-raw",
    RgbLed = "rgb-led",
    ControlMode = "control-mode",
    Waypoints = "waypoints",
    XgoAction = "xgo-action",
}

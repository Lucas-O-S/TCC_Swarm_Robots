/**
 * Transporte da borda (GATEWAY_MODE dela). Parte da identidade do gateway:
 * a mesma borda em mqtt tem o mesmo EDGE_ID e a mesma rede do modo mari.
 */
export enum GatewayMode {
    /** Hardware real (serial/HDLC). */
    Mari = "mari",
    /** RobotSwarmSimulator via broker MQTT. */
    Mqtt = "mqtt",
    /** Simulador fake da borda (só loga hex). */
    Simulator = "simulator",
}

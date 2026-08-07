import 'dotenv/config';

/**
 * Broker MQTT do RobotSwarmSimulator (fronteira /mari/{NETID}/to_edge|to_cloud).
 * Usado só com GATEWAY_MODE=mqtt.
 *
 * `networkId` compartilha o MARI_NETWORK_ID (mesmo NETID nos dois transportes)
 * e TEM que bater com o `network.id` do cenário carregado no simulador -
 * o exemplo.json usa "1200", então MARI_NETWORK_ID=0x1200. Se não bater, o
 * tópico não casa e o simulador descarta os comandos ("network_id ... não é
 * o nosso").
 *
 * `protocolVersion`: o marilib/simulador usa MQTT 5 (default). Brokers de teste
 * em processo (aedes) só falam 3.1.1 -> MQTT_PROTOCOL_VERSION=4.
 */
export const mqttConfig = {
    url: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
    networkId: Number(process.env.MARI_NETWORK_ID ?? 0x1200),
    protocolVersion: (process.env.MQTT_PROTOCOL_VERSION === '4' ? 4 : 5) as 4 | 5,
};

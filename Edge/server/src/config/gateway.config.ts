import 'dotenv/config';
import { edgeConfig } from './edge.config';
import { mariConfig } from './Mari.Config';
import { MariProtocol } from 'src/Protocols/Mari/Mari.Protocol';

/**
 * Transporte da borda (GATEWAY_MODE), lido num ponto só:
 *   mari      -> hardware real (serial/HDLC)
 *   mqtt      -> RobotSwarmSimulator (frota simulada via broker MQTT)
 *   simulator -> qualquer outro valor (ou vazio): simulador fake, só loga hex
 */
export type GatewayMode = 'mari' | 'mqtt' | 'simulator';

export const gatewayConfig = {
    mode: (process.env.GATEWAY_MODE === 'mari' ? 'mari' : process.env.GATEWAY_MODE === 'mqtt' ? 'mqtt' : 'simulator') as GatewayMode,
};

/**
 * Quem é este gateway para o back: a borda (EDGE_ID), o transporte e a rede
 * Mari (MARI_NETWORK_ID, que o MQTT também usa). O modo entra porque a mesma
 * borda reiniciada em mqtt tem o mesmo EDGE_ID e o mesmo MARI_NETWORK_ID - sem
 * ele, os robôs simulados cairiam no gateway real.
 */
export interface GatewayIdentity {
    edgeId: string;
    mode: GatewayMode;
    // 4 hex maiúsculos, ex.: "1200".
    networkId: string;
}

export function gatewayIdentity(): GatewayIdentity {
    return { edgeId: edgeConfig.edgeId, mode: gatewayConfig.mode, networkId: MariProtocol.networkIdHex(mariConfig.networkId) };
}

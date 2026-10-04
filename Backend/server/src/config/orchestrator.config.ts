import 'dotenv/config';

/**
 * Estado inicial da atribuição automática (o loop do orquestrador que entrega
 * tasks pendentes a robôs em Auto). Controlado por ORCHESTRATOR_AUTO no .env
 * (true/false); dá pra ligar/desligar em runtime por PUT /orchestrator/auto.
 * Default: true (comportamento de antes). SemiAuto e as regras reativas não
 * dependem disto.
 */
export const orchestratorConfig = {
    autoEnabled: process.env.ORCHESTRATOR_AUTO !== 'false',
};

import 'dotenv/config';

/**
 * Liga/desliga o "robô fake" do SimulatorGatewayAdapter, que emite um
 * advertisement de teste a cada 3s no onFrameReceived (útil pra exercitar o
 * recebimento sem hardware). Controlado por SIMULATOR_FAKE_ADVERTISEMENT no
 * .env (true/false). Default: false - mesmo padrão do auth.config.
 */
export const simulatorConfig = {
    fakeAdvertisement: process.env.SIMULATOR_FAKE_ADVERTISEMENT === 'true',
};

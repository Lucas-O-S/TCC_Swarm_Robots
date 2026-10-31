import 'dotenv/config';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Calibração LH2 que a borda manda aos robôs (só no modo mari). Arquivo gerado
 * pela captura da própria borda ou pelo `dotbot swarm lh2-calibration` do
 * PyDotBot 0.30.0: ~/.dotbot/calibrations/calibration-*.toml ou o legado
 * ~/.dotbot/calibration.out. Caminho absoluto - o Node não expande "~".
 * Vazio = vale o calibration*.toml mais recente do calibrationDir (o último
 * solve); sem nenhum lá, a borda não calibra ninguém e só repassa o estado
 * lh2 que o robô reportar.
 */
export const lh2Config = {
    calibrationFile: process.env.LH2_CALIBRATION_FILE || null,
    // Onde a captura da própria borda grava o TOML e de onde sai o mais recente
    // no boot. Default = a mesma pasta do PyDotBot, para o arquivo servir também
    // ao CLI.
    calibrationDir: process.env.LH2_CALIBRATION_DIR || join(homedir(), '.dotbot', 'calibrations'),
};

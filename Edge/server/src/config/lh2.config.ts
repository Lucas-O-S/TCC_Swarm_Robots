import 'dotenv/config';

/**
 * Calibração LH2 que a borda manda aos robôs (só no modo mari). Arquivo gerado
 * pelo `dotbot swarm lh2-calibration` do PyDotBot 0.30.0:
 * ~/.dotbot/calibrations/calibration-*.toml ou o legado ~/.dotbot/calibration.out.
 * Caminho absoluto - o Node não expande "~". Vazio = LH2 desligada (a borda não
 * calibra ninguém e só repassa o estado lh2 que o robô reportar).
 */
export const lh2Config = {
    calibrationFile: process.env.LH2_CALIBRATION_FILE || null,
};

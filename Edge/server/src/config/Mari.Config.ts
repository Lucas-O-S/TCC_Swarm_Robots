


import { MARI_DEFAULT_NETWORK_ID } from "src/Constants/Mari.Constants";

export const mariConfig = {
    port : process.env.MARI_PORT ?? "/dev/ttyACM0",
    baudrate : Number(process.env.MARI_BAUDRATE ?? 1000000),
    networkId : Number(process.env.MARI_NETWORK_ID ?? MARI_DEFAULT_NETWORK_ID),

    // Dar START sozinho nos robôs que aparecerem em Bootloader com imagem
    // gravada. Desligado por padrão: com isso em false a borda não comanda a
    // malha - só pede o device-info (leitura: imagem e calibração LH2) e, se
    // LH2_CALIBRATION_FILE estiver preenchido, manda a calibração.
    autoStart : (process.env.MARI_AUTO_START ?? "false") === "true",
}

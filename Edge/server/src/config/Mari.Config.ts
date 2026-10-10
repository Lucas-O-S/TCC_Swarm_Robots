


export const mariConfig = {
    port : process.env.MARI_PORT ?? "/dev/ttyACM0",
    baudrate : Number(process.env.MARI_BAUDRATE ?? 1000000),
    networkId : Number(process.env.MARI_NETWORK_ID ?? 0x0001),

    // Dar START sozinho nos robôs que aparecerem em Bootloader com imagem
    // gravada. Desligado por padrão: com isso em false o backend só ESCUTA os
    // frames SwarmIT (nada é transmitido), o que é o comportamento seguro para
    // quem não espera o backend comandando a malha.
    autoStart : (process.env.MARI_AUTO_START ?? "false") === "true",
}

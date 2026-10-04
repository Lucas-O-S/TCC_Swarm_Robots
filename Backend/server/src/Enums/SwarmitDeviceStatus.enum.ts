
// Estado do robô no protocolo SwarmIT (swarmit/testbed/protocol.py, StatusType).
//
// Bootloader NÃO é erro: é o estado de repouso. O bootloader do swarmit só
// entrega o controle à aplicação depois de um soft reset em que a execução
// anterior pediu explicitamente (device/bootloader/Source/main.c), então todo
// power-on cai aqui e exige um SWARMIT_START.
// Um robô em Bootloader só emite SWARMIT_STATUS - nada de DOTBOT_APP -, e é
// por isso que ele fica invisível para o resto do backend.
export enum SwarmitDeviceStatus {
    Bootloader = 0,
    Running = 1,
    Stopping = 2,
    Resetting = 3,
    Programming = 4,
}

// swarmit/testbed/protocol.py, DeviceType.
export enum SwarmitDeviceType {
    Unknown = 0,
    DotBotV3 = 1,
    DotBotV2 = 2,
    nRF5340DK = 3,
    nRF52840DK = 4,
}

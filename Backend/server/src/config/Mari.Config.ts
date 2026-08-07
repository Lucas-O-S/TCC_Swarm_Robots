


export const mariConfig = {
    port : process.env.MARI_PORT ?? "/dev/ttyACM0",
    baudrate : Number(process.env.MARI_BAUDRATE ?? 1000000),
    networkId : Number(process.env.MARI_NETWORK_ID ?? 0x0001),
}
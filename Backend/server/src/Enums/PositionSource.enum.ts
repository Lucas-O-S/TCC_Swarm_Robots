/**
 * De onde veio uma amostra de posição. Isto é determinado pelo tipo de
 * payload que chegou no frame (LH2_PROCESSED_DATA/DOTBOT_ADVERTISEMENT vs
 * GPS_POSITION/SAILBOT_DATA no protocolo do DotBot), por isso mora no
 * módulo de Protocolo, junto de RobotApplication/RobotControlMode.
 */
export enum PositionSource {
    /** x/y em milímetros (DotBot, Freebot, XGO). */
    LH2 = 0,
    /** x = latitude, y = longitude, graus decimais (SailBot). */
    GPS = 1,
}

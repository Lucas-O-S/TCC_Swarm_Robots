/**
 * ApplicationType do protocolo DotBot (dotbot/protocol.py).
 *
 * é um valor que trafega de verdade dentro
 * do payload binário trocado com o robô (ex.: campo `application` de um
 * PayloadAdvertisement). Por isso mora no módulo de Protocolo, não junto de
 * um model do Sequelize - o parser de frames vai precisar deste mesmo enum
 * sem ter nenhuma dependência de ORM.
 */
export enum RobotApplication {
    DotBot = 0,
    SailBot = 1,
    Freebot = 2,
    XGO = 3,
    LH2MiniMote = 4,
}

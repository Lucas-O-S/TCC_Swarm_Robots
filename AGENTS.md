# TCC_Swarm_Robots

## Purpose

TCC (trabalho de conclusão de curso) que replica a arquitetura do projeto
[DotBots](https://github.com/DotBots) ("Dazzling Swarm Robots" - Inria/Paris),
mas mantendo backend em **NestJS + PostgreSQL/Sequelize** em vez do backend
Python (FastAPI) que o DotBots usa. A referência principal é o
[PyDotBot](https://github.com/DotBots/PyDotBot) - o "control plane" deles,
que expõe REST + WebSocket para controlar e rastrear uma frota de robôs via
um gateway de rádio. Não estamos usando o código deles, só a arquitetura e o
formato de protocolo como especificação a seguir.

Este arquivo existe para que qualquer sessão do Claude (ou qualquer pessoa)
que continue este projeto - inclusive de outro computador - tenha o
contexto das decisões já tomadas, sem precisar re-derivar tudo de novo.
As "folder instructions" configuradas no Cowork têm só a instrução original
de uma linha; este arquivo é a fonte de verdade detalhada, versionada com o
resto do código.

## Stack

- **Backend**: NestJS 11, Sequelize (`@nestjs/sequelize` + `sequelize-typescript`), PostgreSQL (`pg`)
- **Frontend**: pasta existe (`Frontend/`), ainda vazia - será decidido depois (o PyDotBot usa React + TypeScript + Vite, mapa via react-leaflet, joystick)
- **Repo**: `github.com/Lucas-O-S/TCC_Swarm_Robots`, branch de trabalho atual `Merge/Back/ClasseRobot`

## Correspondência com o DotBot (o que já foi decidido)

O PyDotBot separa claramente três camadas: **protocolo** (formato binário dos
pacotes trocados com o robô via rádio, `dotbot/protocol.py`), **transporte**
(serial/MQTT/simulador, `dotbot/adapter.py`) e **controller** (estado da
frota em memória + API, `dotbot/controller.py`). Estamos replicando essa
separação em módulos NestJS:

- `src/Protocol/` - constantes e (futuramente) o encode/decode dos payloads
  binários. Guarda só o que **realmente trafega no pacote de rádio**:
  - `Enums/RobotApplication.enum.ts` - `ApplicationType` (0=DotBot, 1=SailBot,
    2=Freebot, 3=XGO, 4=LH2_mini_mote)
  - `Enums/RobotControlMode.enum.ts` - `ControlModeType` (0=Manual, 1=Auto)
- `src/Model/` - persistência (Sequelize). Guarda só o que faz sentido durar
  no banco:
  - `Base.Model.ts` - colunas universais (`uuid`, `createdAt`, `updatedAt`,
    `deletedAt`/paranoid). **Não tem `name`** de propósito: nem toda tabela
    tem nome (ex.: `position`).
  - `Robot.Model.ts` - tabela `robots`.
  - `Enums/RobotStatus.enum.ts` - `DotBotStatus` (0=Active, 1=Inactive,
    2=Lost). Diferente dos enums do Protocol, este **nunca é transmitido**
    pelo robô - é calculado pelo backend a partir de `lastSync`.
  - `Position.Model.ts` - **ainda não criado**. A tabela `position` já
    existe no `init.sql`, falta o model Sequelize correspondente.

## Schema atual (`database/sql/init.sql`)

- `tasks` - conceito da nossa aplicação, não existe no DotBot.
- `robots` - espelha `DotBotModel` (`dotbot/models.py`). Tudo em
  `snake_case` (o `Robot.Model.ts` usa `@Table({ underscored: true })` pra
  bater com isso automaticamente). Chave real do protocolo é a coluna
  `address` (hex, `UNIQUE`), não o `uuid`.
- `position` - histórico de posição. Tem coluna `source` (0=LH2 em mm,
  1=GPS em graus decimais) porque o DotBot tem duas fontes de posição com
  unidades diferentes (LH2 pra DotBot/Freebot/XGO, GPS pra SailBot) e não dá
  pra misturar sem indicar a origem.

## Pendente (próximos passos)

1. `Position.Model.ts` (Sequelize) + registrar em `Robot.module.ts`.
2. Tabelas de referência opcionais (`robot_applications`, `robot_control_modes`).
3. Módulo `Protocol`: encode/decode dos payloads binários (mirror de
   `dotbot/protocol.py` - `PayloadType`, `PayloadCommandRgbLed`,
   `PayloadDotBotAdvertisement`, etc.), usando `Buffer` no lugar dos
   dataclasses do Python.
4. Módulo de transporte (`GatewayAdapter`): interface comum + implementação
   `SerialGatewayAdapter` (lib `serialport`) e `SimulatorGatewayAdapter`
   (pra desenvolver sem hardware).
5. `SwarmService`: estado em memória (`Map<address, RobotState>`),
   processamento de frames recebidos (mirror de
   `Controller.handle_received_frame`), throttling de escrita no Postgres.
6. `RobotsGateway` (WebSocket, `@nestjs/websockets`) emitindo os eventos
   `NEW_DOTBOT` / `UPDATE` / `RELOAD` (mirror de `DotBotNotificationCommand`).
7. Preencher `Robot.Controller.ts` / `Robot.Service.ts` / `robot.create.dto.ts`
   (hoje são stubs vazios) com os endpoints REST: `GET /robots` (com filtros
   de status/bateria/posição), `GET /robots/:address`, `POST
   /robots/:address/rgb-led`, `/move`, `/waypoints`, `/control-mode`.

## Don't

- Não colocar enums de protocolo (`RobotApplication`, `RobotControlMode`)
  dentro de arquivos de `Model/` - eles vão ser usados pelo módulo de
  Protocolo também, que não deve depender de Sequelize.
- Não gravar no Postgres em cima de cada pacote recebido do robô
  (`direction`, heading, LED) - isso é estado de memória, não de banco.
- Não recriar a tabela `status` como lookup pra `robots.status` - é
  recalculada o tempo todo a partir de `lastSync`, não escolhida.
- Não confundir `uuid` (chave interna do Postgres) com `address` (chave
  física do protocolo) - frames de rádio são endereçados por `address`.

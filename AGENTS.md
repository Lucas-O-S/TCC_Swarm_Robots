# TCC_Swarm_Robots

Repositório: [github.com/Lucas-O-S/TCC_Swarm_Robots](https://github.com/Lucas-O-S/TCC_Swarm_Robots)

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
- **Repo**: [github.com/Lucas-O-S/TCC_Swarm_Robots](https://github.com/Lucas-O-S/TCC_Swarm_Robots), branch de trabalho atual `Merge/Back/ClasseRobot`

## Padrão de código de referência: `ApiGameHit`

O dono do projeto tem um repo próprio ([Lucas-O-S/ApiGameHit](https://github.com/Lucas-O-S/ApiGameHit),
NestJS + Sequelize) que representa como ele gosta de programar. Vale
consultar antes de criar qualquer módulo novo. Padrões observados lá:

- **Controller → Service → Repository → Model.** O Service nunca chama o
  Sequelize direto; sempre passa por uma classe `*.Repository.ts`
  (`@InjectModel`, métodos `insert/update/get/getAll/delete/exists`).
  **Já adotado aqui** (`Robot.Repository.ts`).
- **`ApiResponseInterface`** - toda resposta de Controller segue
  `{ status, message, data?, dataUnit?, error? }`, com try/catch em cada
  endpoint convertendo erro genérico em `status: 500`. **Ainda não
  adotado** neste projeto.
- **DTOs** com `class-validator` (mensagens de erro em português) +
  `@ApiProperty` do Swagger em cada campo. **Ainda não adotado**
  (`robot.create.dto.ts` continua stub vazio).
- **Guards em camadas**: `JwtAuthGuard` no controller inteiro + guards
  extras por rota (permissão de admin, dono do recurso), agregados em
  `index/indexAuthGuards.ts`. **Ainda não decidido** se este projeto vai
  ter autenticação de operador - não implementado.
- **Módulos agregados** em `App/index/IndexModule.ts` (`export const
  AllModules = [...]`), importado no `app.module.ts` com spread.
  **Ainda não adotado.**
- **Models**: no `ApiGameHit` ele usa PK inteiro auto-increment, tabela
  prefixada `tb_` e `timestamps: false` (sem soft-delete). **Neste
  projeto ficou diferente de propósito**: `robots`/`position`/`tasks`
  usam PK `UUID` + `paranoid` (soft-delete) + timestamps automáticos,
  porque a chave real de negócio aqui não é o PK e sim `address` (a
  identidade física do rádio) - isso foi decidido e confirmado
  explicitamente com o dono do projeto, não é uma divergência acidental.
- **Relações sempre explícitas** (`@ForeignKey`/`@BelongsTo`/`@HasMany`),
  nunca uma coluna de FK solta. **Já adotado** (`Robot.Model.ts` ↔
  `Task.Model.ts` ↔ `Position.Model.ts`).

Quando for construir Controller/Service/DTO de verdade (item 7 da lista de
"Pendente"), seguir o estilo do `ApiGameHit` (try/catch +
`ApiResponseInterface`, `class-validator`, `@ApiProperty`) a menos que o
dono do projeto peça o contrário.

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
  - `Enums/PositionSource.enum.ts` - de onde veio uma amostra de posição
    (LH2 vs GPS), decidido pelo tipo de payload recebido.
- `src/Model/` - persistência (Sequelize). Guarda só o que faz sentido durar
  no banco:
  - `Base.Model.ts` - colunas universais (`uuid`, `createdAt`, `updatedAt`,
    `deletedAt`/paranoid). **Não tem `name`** de propósito: nem toda tabela
    tem nome (ex.: `position`).
  - `Robot.Model.ts` - tabela `robots`. Tem `@BelongsTo(() => TaskModel)` e
    `@HasMany(() => PositionModel)`.
  - `Enums/RobotStatus.enum.ts` - `DotBotStatus` (0=Active, 1=Inactive,
    2=Lost). Diferente dos enums do Protocol, este **nunca é transmitido**
    pelo robô - é calculado pelo backend a partir de `lastSync`.
  - `Task.Model.ts` - tabela `tasks` (conceito nosso, não existe no DotBot).
  - `Position.Model.ts` - tabela `position`, `@BelongsTo(() => RobotModel)`.
- `src/Classes/Robots/` - camada de API do robô, seguindo o padrão
  Controller → Service → Repository (ver seção "Padrão de código de
  referência" acima). `Robot.Repository.ts` já existe; `Robot.Controller.ts`
  e `Robot.Service.ts` ainda são stubs (item 7 de "Pendente").

### Regra geral: nem tudo vira coluna

O PyDotBot mantém quase todo o estado só em memória (`Controller.dotbots`,
um dict); a única coisa persistida em disco é o arquivo de calibração LH2 e,
opcionalmente, um CSV de log. Como decidimos usar Postgres pra valer (não é
cópia 1:1 do PyDotBot nisso), a régua usada para decidir "banco vs memória"
foi:

- **Alta frequência de mudança + sem valor de auditoria/relatório → só
  memória.** `direction` (heading) e a cor do LED RGB mudam a cada
  pacote/comando; não têm coluna em `robots`. `direction` fica gravado por
  amostra na tabela `position` (que já é throttled); a cor do LED só importa
  em tempo real e o próprio robô é quem "lembra" o valor de verdade - o
  backend é só um espelho.
- **Muda com frequência mas tem valor histórico → banco, com escrita
  throttled (não a cada pacote).** `status` e `battery`: gravar a cada
  pacote recebido geraria centenas de writes/segundo num enxame grande.
  Ainda não implementado (depende do `SwarmService`, ver "Pendente" abaixo).
- **Baixa frequência (muda só por ação explícita) → banco, sem
  necessidade de throttling.** `address`, `name`, `application`, `swarmId`,
  `calibrated`, `mode`, `waypointsThreshold`, `taskId`.

Quando o `SwarmService` (camada "quente", em memória) for implementado, ele
guarda um `Map<address, RobotState>` com tudo que muda rápido, serve o
WebSocket direto dali, e só grava no Postgres de forma amostrada/no evento
certo (mudança de status, chegada de robô novo, comando do operador).

### Enums vs. tabelas de referência

`RobotApplication`/`RobotControlMode`/`RobotStatus` são `smallint` com
`CHECK` no banco, não FK para tabela de lookup. Motivo: são valores fixados
pelo protocolo/firmware - não dá pra "adicionar um novo valor" só inserindo
uma linha no banco, precisaria mudar o parser de protocolo de qualquer
jeito, então a flexibilidade de uma lookup table seria ilusória aqui (esse
foi o motivo de já termos removido a tabela `status` original). Se quiser
legibilidade em SQL cru pra relatórios do TCC, a ideia (ainda não aplicada)
é criar tabelas de referência somente-leitura (`robot_applications`,
`robot_control_modes`), sem FK obrigando nada, só pra `JOIN` opcional.

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

1. ~~`Position.Model.ts` (Sequelize) + registrar em `Robot.module.ts`.~~ **Feito**,
   junto com `Task.Model.ts` e as associações (`@BelongsTo`/`@HasMany`).
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
   (hoje são stubs vazios, só `Robot.Repository.ts` existe) com os endpoints
   REST: `GET /robots` (com filtros de status/bateria/posição), `GET
   /robots/:address`, `POST /robots/:address/rgb-led`, `/move`, `/waypoints`,
   `/control-mode`. Seguir o estilo `ApiGameHit` (`ApiResponseInterface`,
   `class-validator`, `@ApiProperty`) - ver seção acima.
8. `TaskModule`/`PositionModule` dedicados, se/quando ganharem endpoints
   próprios (hoje os models estão registrados dentro de `Robot.module.ts`
   por conveniência).
9. Decidir se o projeto vai ter autenticação de operador (JWT + guards, como
   no `ApiGameHit`) ou não - ainda em aberto.

## Don't

- Não colocar enums de protocolo (`RobotApplication`, `RobotControlMode`,
  `PositionSource`) dentro de arquivos de `Model/` - eles vão ser usados
  pelo módulo de Protocolo também, que não deve depender de Sequelize.
- Não gravar no Postgres em cima de cada pacote recebido do robô
  (`direction`, heading, LED) - isso é estado de memória, não de banco.
- Não recriar a tabela `status` como lookup pra `robots.status` - é
  recalculada o tempo todo a partir de `lastSync`, não escolhida.
- Não confundir `uuid` (chave interna do Postgres) com `address` (chave
  física do protocolo) - frames de rádio são endereçados por `address`.
- Não adicionar coluna de FK sem o par `@ForeignKey`/`@BelongsTo` (ou
  `@HasMany` do outro lado) - é o padrão usado no `ApiGameHit`, seguir aqui
  também.
- Não copiar o estilo de `Model` do `ApiGameHit` (PK inteiro, `tb_`, sem
  timestamps) sem perguntar antes - já foi decidido manter UUID/paranoid
  aqui, é uma divergência intencional, não um esquecimento.

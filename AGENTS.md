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

**Atualização (decisões já tomadas sobre o que adotar do `ApiGameHit`):**

- **Base genérica (`BaseController`/`BaseService`/`BaseRepository` em
  `src/Classes/Base/`)**: o `ApiGameHit` NÃO tem isso - cada entidade repete
  `insert/update/get/getAll/delete/exists` na mão. Aqui decidimos generalizar
  isso numa base comum; `Robot.Repository.ts`/`Robot.Service.ts`/
  `Robot.Controller.ts` estendem essas classes e só sobrescrevem o que é
  específico (ver comentário no `BaseController` sobre por que `create`/
  `update` precisam ser redeclarados com o DTO concreto - genéricos somem em
  runtime e o `ValidationPipe` pula a validação se o metatype vira `Object`).
- **`ApiResponseInterface`**: **adotado**, mas não do jeito literal do
  `ApiGameHit` (try/catch copiado em cada método do Controller). Em vez
  disso, um `NestInterceptor` global (`ApiResponseInterceptor`) envelopa toda
  resposta de sucesso e um `ExceptionFilter` global
  (`ApiResponseExceptionFilter`) envelopa qualquer exception lançada -
  ambos em `src/Classes/Base/`, plugados em `main.ts`
  (`app.useGlobalInterceptors`/`useGlobalFilters`). Vantagem: nenhum
  Controller precisa de try/catch manual, e o `message` é genérico por
  status HTTP (`src/Classes/Base/ApiResponse.Messages.ts`), não uma frase
  por ação - o detalhe específico do erro (ex.: "Nome de usuário já está em
  uso") vai no campo `error`, extraído da exception real (`HttpException`
  real como 404/409/401, ou um `Error` genérico vira 500).
- **DTOs com `class-validator` (mensagens em pt-br) + `@ApiProperty`**:
  **adotado** (`RobotCreateDto`, `RobotUpdateDto` via `PartialType`,
  `UserCreateDto`, `LoginDto`).
- **Schemas manuais pro `@ApiBody`**: **adotado**
  (`Robot.Schema.ts`, `User.Schema.ts`, `Login.Schema.ts`).
- **Guards (`JwtAuthGuard`)**: **adotado**, com uma diferença importante do
  `ApiGameHit` - ver seção "Autenticação" abaixo.
- **`IndexModule`**: **adotado** (`src/index/IndexModule.ts`, `AllModules`
  importado com spread em `app.module.ts`).

## Autenticação

Sistema básico de usuário/senha (não é o `ApiGameHit` completo - sem roles/
admin por enquanto, só login):

- `src/Model/User.Model.ts` - `username` (único) + `passwordHash` (bcrypt).
  UUID/paranoid/timestamps como todo model daqui (ver "Divergência
  intencional" mais abaixo). Tem `defaultScope` excluindo `passwordHash` de
  toda query (evita vazar o hash no `GET /users` genérico do
  `BaseController`) - só `UserRepository.getByUsername` pede de volta via
  `.unscoped()`, porque é o único lugar que precisa (login).
- `src/Classes/Users/` - `UserRepository`/`UserService`/`UserModule`/
  `UserController` (`GET`/`PUT`/`DELETE` via `BaseController`). `create` é
  bloqueado de propósito (lança `ForbiddenException`) - criar usuário só via
  `POST /auth/register`, garante hash de senha + checagem de username
  duplicado. `update` usa `UserUpdateDto` (só `username` - sem
  `passwordHash`, trocar senha é um fluxo à parte, não implementado).
- `src/Auth/` - `AuthModule`, `AuthController` (`POST /auth/register`,
  `POST /auth/login`, `GET /auth/me` de teste), `AuthService` (bcrypt
  compare + assina JWT via `@nestjs/jwt`), `JwtStrategy`
  (`passport-jwt`), `JwtAuthGuard`.
- **`AUTH_ACTIVATED` (`.env`, lido em `src/config/auth.config.ts`)**: liga/
  desliga a autenticação **globalmente**, num ponto único. `JwtAuthGuard`
  checa `authConfig.activated` antes de checar o token - se `false`, libera
  geral sem validar nada (`request.user` fica `undefined`). Pedido explícito
  do dono do projeto pra poder desenvolver sem precisar logar o tempo todo;
  default hoje é `false` no `.env` local. Mudar pra `true` quando o front
  tiver login implementado.
- Hoje só `RobotController` usa `@UseGuards(JwtAuthGuard)` (nível de classe -
  cobre também as rotas herdadas do `BaseController`). Novos controllers
  devem aplicar o mesmo guard a menos que a rota precise ser pública.

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
  - `User.Model.ts` - tabela `users` (conceito nosso, auth - não existe no
    DotBot/protocolo).
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
7. ~~Preencher `Robot.Controller.ts`/`Robot.Service.ts`/`robot.create.dto.ts`~~
   **Feito** o CRUD genérico (via `BaseController`/`BaseService`) + DTOs.
   Ainda faltam as rotas específicas do protocolo: `GET /robots/:address`,
   `PUT /robots/:address/move-raw`, `/rgb-led`, `/waypoints` (mapeando
   `dotbot/server.py` do PyDotBot - `address`, não `uuid`, porque são
   endereçadas fisicamente).
8. `TaskModule`/`PositionModule` dedicados, se/quando ganharem endpoints
   próprios (hoje os models estão registrados dentro de `Robot.module.ts`
   por conveniência).
9. ~~Decidir se o projeto vai ter autenticação de operador~~ **Feito**: auth
   básica usuário/senha implementada (ver seção "Autenticação"), com toggle
   `AUTH_ACTIVATED` pra ligar/desligar. Ainda em aberto: roles/permissões
   (admin vs operador comum) - hoje todo usuário autenticado tem acesso
   igual.

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

# TCC_Swarm_Robots

Repositório: [github.com/Lucas-O-S/TCC_Swarm_Robots](https://github.com/Lucas-O-S/TCC_Swarm_Robots)

## Purpose

TCC (trabalho de conclusão de curso) que replica a arquitetura do projeto
[DotBots](https://github.com/DotBots) ("Dazzling Swarm Robots" - Inria/Paris),
mas mantendo backend em **NestJS + PostgreSQL/Sequelize** em vez do backend
Python (FastAPI) que o DotBots usa.

A inspiração é a **organização DotBots como um todo** (github.com/DotBots),
não um repo só - cada repo do org cobre uma camada diferente do problema.
Os dois que mais importam pra este projeto, cada um com um papel diferente:

- **[PyDotBot](https://github.com/DotBots/PyDotBot)** é a referência pra
  parte que conecta com o front: o "control plane" que expõe REST +
  WebSocket pra controlar/rastrear a frota via um gateway de rádio - formato
  dos payloads (waypoints, rgb-led, move-raw), modelo de status
  (`DotBotStatus`) e o enum de modo (`ControlModeType` Manual/Auto). É daqui
  que vem a estrutura de rotas do `RobotController` e o `RobotsGateway`
  (WebSocket) planejado.
- **[swarmit](https://github.com/DotBots/swarmit)** é a inspiração pro lado
  de automação/orquestração do enxame. Diferente do PyDotBot (que só manda
  uma lista de waypoints avulsa, sem persistir nada), o swarmit trata o
  robô como algo que roda um "programa"/experimento gerenciado
  remotamente (`flash`/`start`/`stop`/`monitor`/`status`), com um servidor
  compartilhado que já usa **JWT** (`swarmit serve`) - o mesmo caminho que a
  gente já adotou aqui. É o paradigma mais próximo do que queremos pro lado
  automatizado: `Task` ganhar conteúdo real e o sistema conseguir
  atribuir/executar trabalho no enxame sem um operador clicando em cada
  robô.

Não estamos usando o código de nenhum desses repos, só a arquitetura e os
formatos de protocolo/decisões de design como especificação a seguir.

Este arquivo existe para que qualquer sessão do Claude (ou qualquer pessoa)
que continue este projeto - inclusive de outro computador - tenha o
contexto das decisões já tomadas, sem precisar re-derivar tudo de novo.
As "folder instructions" configuradas no Cowork têm só a instrução original
de uma linha; este arquivo é a fonte de verdade detalhada, versionada com o
resto do código.

## Objetivo: controle manual + automatizado

O dono do projeto quer que o sistema permita **os dois modos de controle
convivendo**, não um só:

- **Manual**: operador manda comando direto pra um robô específico (tipo
  joystick/waypoint avulso) - já mapeado no protocolo via
  `RobotControlMode.Manual`.
- **Automatizado**: o sistema atribui/executa `Task`s sozinho, sem um
  humano clicando em cada robô - `RobotControlMode.Auto`. Cada robô tem seu
  próprio modo (coluna `mode` em `robots`), então dá pra ter parte da frota
  em manual e parte em automático ao mesmo tempo.
- **SemiAuto** (`RobotControlMode.SemiAuto = 2`, adicionado depois): executa
  tasks de forma autônoma (segue waypoints) igual ao Auto, MAS fica fora da
  fila do orquestrador - a task é atribuída **manualmente** por um humano (rota
  `PUT /orchestrator/robots/:address/assign`). É o meio-termo entre Manual e
  Auto: não é dirigido no joystick, mas também não recebe task sozinho. O
  `getFreeRobots` só pega `Auto`, então o SemiAuto naturalmente não entra na
  atribuição automática.

Sobre funcionar **"de forma adaptativa"** (pergunta feita no chat) - a
resposta é "depende do nível", ainda nenhum foi implementado:

1. **Atribuição automática simples** (viável com o que já existe hoje,
   uma vez que `Task` ganhe conteúdo de missão - ver "Pendente"): o sistema
   escolhe automaticamente qual robô pega qual task pendente, com base em
   prioridade/status/bateria. É lógica de consulta ao Postgres, não precisa
   de nada em tempo real.
2. **Reativo/adaptativo de verdade** (**FEITO**, menos a recarga - ver
   "Adiado" abaixo): o sistema reage a mudanças de estado *enquanto elas
   acontecem* - solta a task de volta pra fila se o robô ficar `Lost` no
   meio, conclui a task quando o `waypoint_idx` chega no fim. Isso roda via
   eventos internos (EventEmitter2): o `SwarmService` emite, um
   `OrchestratorListener` escuta e chama o `OrchestratorService`. A recarga
   em bateria baixa foi adiada (decisão de design, ver "Adiado").
3. **Aprendizado/otimização** (ex.: machine learning pra decidir alocação) -
   fora de escopo por enquanto, não faz parte do plano atual.

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
  - `Enums/RobotControlMode.enum.ts` - `RobotControlMode` (0=Auto, 1=Manual,
    2=SemiAuto - ver "Objetivo" acima; o CHECK em `robots.mode` é 0..2)
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
  referência" acima). `Robot.Repository.ts`, `Robot.Service.ts` e
  `Robot.Controller.ts` **já construídos**, com as 5 rotas de comando do
  protocolo - ver seção "Camada de protocolo, transporte e comandos
  (CONSTRUÍDO)" abaixo.

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
  throttled (não a cada pacote).** `status`, `battery`, `lastSync` e o
  histórico de `position`: gravar a cada pacote geraria centenas de
  writes/segundo num enxame grande. **Implementado** - o `SwarmService` é o
  único escritor, via um job periódico (1s) que só grava quando algo muda
  (status/bateria) e descarta amostras de posição muito próximas da última
  (throttle por distância). Ver "Persistência de estado" abaixo.
- **Baixa frequência (muda só por ação explícita) → banco, sem
  necessidade de throttling.** `address`, `name`, `application`, `swarmId`,
  `calibrated`, `mode`, `waypointsThreshold`, `taskId`.

Quando o `SwarmService` (camada "quente", em memória) for implementado, ele
guarda um `Map<address, RobotState>` com tudo que muda rápido, serve o
WebSocket direto dali, e só grava no Postgres de forma amostrada/no evento
certo (mudança de status, chegada de robô novo, comando do operador).

**Bug corrigido (auditoria de código):** `Robot.Model.ts` tinha uma coluna
`direction` que violava essa regra e além disso nem existia na tabela
`robots` do `init.sql` (só `position.direction` existe) - toda query
quebraria assim que o banco estivesse de pé. Removida do model.

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

## Camada de protocolo, transporte e comandos (CONSTRUÍDO)

Esta seção descreve o que já existe de verdade no código (supera as descrições
antigas em "Correspondência com o DotBot", que eram planejamento). **Nota de
pasta**: a implementação ficou em `src/Protocols/` (plural) e os enums de
protocolo em `src/Enums/` (não `src/Protocol/Enums/` como o texto antigo dizia).

Tudo foi conferido **byte a byte contra o PyDotBot original** (move, rgb,
control-mode, waypoints, xgo-action e dotbot-advertisement), e o round-trip do
frame (`buildFrame` → `parseFrame`) bate.

### `src/Protocols/Protocol.ts` - frame (monta e desmonta)

- Classe `Frame` = saco de dados: `header: Buffer`, `payloadType: PayloadType | null`, `body: Buffer`.
- `Protocol.buildHeader(destination, version=1, type=16)`: header de **18 bytes**
  little-endian - version(1B)=1, type(1B)=16 (`PacketType.DATA`), destination(8B)
  = o `address` via `BigInt("0x"+address)` com `writeBigUInt64LE`, source(8B)=0.
- `Protocol.buildFrame(frame: Frame)`: `header + [payloadType] + body` (concat).
- `Protocol.parseFrame(buffer)`: o inverso - fatia header (0-17), lê o
  payloadType (byte 18, validado via `validPayloadType` do enum → `null` se
  desconhecido) e o body (`subarray(19)`).

### `src/Protocols/Protocol.Codec.ts` - motor metadata (encode + decode)

- `PayloadField` = descrição de um campo (`field`, `length?`, `signed?`, sem valor).
- `PayloadItem extends PayloadField` = descrição **+ `value`** (usado no encode).
- `PayloadCodec`: encode no construtor (`new PayloadCodec(items).Payload`) e
  `static decode(buffer, fields)`. Ambos percorrem os campos andando o offset
  pelo `length`; o `switch` trata 1/2/4 bytes, com/sem sinal, little-endian.
  **É o mesmo motor pros dois sentidos** (co-dec), não dois separados.

### `src/Protocols/Wrappers/` - um arquivo por payload

- Contratos (`PayloadProtocol.ts`), **separados por direção** porque payload é
  de mão única: `PayloadProtocol<T>` (encode, quem **sai**) e `PayloadDecoder<T>`
  (decode, quem **entra**). `genericPayload` é um marcador vazio (inerte; pode
  sair sem perda).
- **Encoders (saída)**: `MovePayloadProtocol`, `RgbLedPayloadProtocol`,
  `ControlModePayloadProtocol`, `Lh2WaypointsPayloadProtocol`, `XgoActionPayloadProtocol`.
- **Decoders (entrada)**: `AdvertisementProtocol`, `GpsPositionProtocol`,
  `DotBotAdvertisementProtocol` (o principal), `SailBotDataProtocol`,
  `Lh2ProcessedLocationProtocol`, `DotBotSimulatorDataProtocol`.
- Cada wrapper tem: interface tipada (o formato) + lista de campos (`*Fields`,
  a "planta" dos bytes) + a classe. A **mesma lista** alimenta encode e decode.
- **Waypoints é de tamanho variável**: o wrapper **compõe** (motor pras partes
  fixas `threshold`+`count`, e `Buffer.concat` pra lista de pontos) em vez de
  inchar o motor com suporte a lista. Decisão consciente: compor é mais simples
  pra 1 payload; se aparecerem mais listas, generalizar o motor. Os payloads de
  **entrada** que o robô manda são todos de tamanho **fixo**, então o decode não
  precisa de lista.
- Deixados **de fora** de propósito (não são campos fixos simples):
  `LH2_CALIBRATION_HOMOGRAPHY` (bloco cru de 36 bytes), `RAW_DATA` (bytes
  variáveis), e os `*_WAYPOINTS` (saída, lista).

### `src/Protocols/PayloadSelector.ts` - factory

- `getPayloadCoder(payloadType)` escolhe o **encoder** pelo tipo (comando que
  sai); `getPayloadDecoder(payloadType)` escolhe o **decoder** (dado que entra).
  Os dois são `switch` + `default: null`. (Nota: o contrato do encoder foi
  renomeado de `PayloadProtocol<T>` para `PayloadCoder<T>`; o do decoder é
  `PayloadDecoder<T>`.)

### `src/adapter/` - transporte

- `GatewayAdapter.interface.ts`: contrato `send(destination, payloadType, body,
  version?, type?)` + `onFrameReceived(cb)`, e o **token de injeção**
  `GATEWAY_ADAPTER` (interface some em runtime, então injeta por token).
- `Simulator/SimulatorGateway.Adapter.ts`: `SimulatorGatewayAdapter`
  (`@Injectable`). `send` monta o `Frame` e **imprime o hex no console** (não vai
  pra USB). `onFrameReceived` simula um robô fake `0000000000000001`
  **emitindo um advertisement real a cada 3s** (header com `source`=robô +
  payloadType 0x06 + body), pra exercitar o recebimento sem hardware.
- O adapter é provido pelo **`GatewayModule`** (`src/Classes/Gateway/Gateway.Module.ts`):
  `{ provide: GATEWAY_ADAPTER, useClass: SimulatorGatewayAdapter }` + `exports`
  do token. `RobotModule` e `SwarmModule` **importam** esse módulo, então
  compartilham **a mesma instância** do adapter (envio e recebimento na mesma
  "linha"). Trocar Simulador→Serial/Mari é uma linha só, no GatewayModule.

### `src/Classes/Robots/` - rotas de comando (não são mais stubs)

- 5 rotas endereçadas por `address`: `PUT /robots/:address/{move-raw, rgb-led,
  control-mode, waypoints, xgo-action}`. Cada uma com DTO (class-validator pt-br
  + `@ApiProperty`) e Schema manual pro `@ApiBody`. Waypoints usa validação
  aninhada (`@ValidateNested` + `@Type`, funciona porque `main.ts` tem
  `ValidationPipe({ transform: true })`).
- Todas delegam pro `RobotService.sendCommand(address, payloadType, command,
  payload)`: confere o robô existe (404 senão), e o `dispatch` escolhe o codec
  no `PayloadSelector`, codifica e chama `gateway.send`. Um método só pros 5
  comandos.

### `src/Classes/Swarm/` - recebimento (FEITO, início do bloco E)

O ciclo agora **vai e volta** (comando sai, status entra). Peças:

- `SwarmService` (`@Injectable`, `implements OnModuleInit`): guarda
  `Map<address, {payloadType, data, updatedAt}>` em memória. No `onModuleInit`
  registra o handler via `gateway.onFrameReceived`. O `handleFrame`: guarda
  contra frame < 19 bytes → `Protocol.parseFrame` → `PayloadSelector.getPayloadDecoder`
  → `decodePayload` → grava por `address` (lido do `source` do header, offset 10)
  e loga. Expõe `getState(address)` e `getAll()`.
- `SwarmController`: `GET /robots/:address/status` devolve o último estado
  decodificado do robô (do Map). Mesmo prefixo `robots`, rota distinta das do
  RobotController - não colide.
- `SwarmModule`: `imports: [GatewayModule]`, `providers: [SwarmService]`,
  `controllers: [SwarmController]`, `exports: [SwarmService]`. Registrado no
  `IndexModule` (`AllModules`).
- Testado ponta a ponta: o simulador emite o advertisement, o SwarmService
  decodifica e o `GET /status` mostra `{direction, pos_x, battery, mode, ...}`.

**Atualização**: o "ainda de memória-só" foi resolvido - o SwarmService agora
persiste no Postgres, recalcula status por `lastSync`, grava histórico de
posição e emite eventos (internos + WebSocket). Ver "Persistência de estado" e
"Automação nível 2" abaixo.

### WebSocket (bloco G, tempo real) - FEITO

- `RobotWebsockets` (`src/Websockets/Robot.Websockets.ts`, `@WebSocketGateway({ cors })`)
  com `@WebSocketServer() server` e `emitUpdate(address, state)` →
  `server.emit("robot:update", ...)`.
- O `SwarmService` injeta ele e chama `emitUpdate` no fim do `handleFrame` - cada
  estado decodificado é empurrado ao vivo pro front (evento `robot:update`), sem
  polling.
- Deps: `@nestjs/websockets` + `@nestjs/platform-socket.io`. Registrado nos
  `providers` do `SwarmModule`. Testado com um cliente socket.io simples.

### Automação nível 1 (blocos A + F) - FEITO

**A - Task ganhou conteúdo de missão:**
- `TaskStatus` enum (`src/Model/Enums/`, Pending/InProgress/Completed/Cancelled).
- `TaskModel.status` (`@Default(Pending)`) + `@HasMany(() => TaskWaypointModel) waypoints`.
- `TaskWaypointModel` (tabela `task_waypoints`: `taskId`, `orderIndex`, `x`, `y`).
- `init.sql`: coluna `status` em `tasks`, tabela `task_waypoints`, e um seed da task
  "Patrulha de teste" (uuid `...0002`) com 3 waypoints pra testar a automação.

**F - `OrchestratorService`** (`src/Classes/Orchestrator/`):
- `assignPending()`: pega tasks Pending com waypoints (`taskService.getPendingTask`
  com `include: [TaskWaypointModel]`, order por priority) + robôs livres em Auto
  (`robotService.getFreeRobots`, `taskId=null` e `mode=Auto`), emparelha 1:1; pra
  cada par manda os waypoints (reusa `sendCommand`) e **só então** marca a task
  InProgress + grava `taskId` no robô (persiste só o campo mudado).
- Guardas: pula task sem waypoints; envio protegido (retorna bool) - só atribui se
  o envio funcionou (o próximo ciclo tenta de novo se falhar).
- Gatilho: `onModuleInit` + `setInterval(assignPending, 5000)` com `.catch` (é job
  de fundo, sem o ExceptionFilter do HTTP - por isso o catch é obrigatório).
- `OrchestratorModule` importa `RobotModule` + `TaskModule`; registrado no `IndexModule`.
- **1 task ↔ N robôs já cabe no schema** (`robots.task_id` é muitos-pra-um); hoje o
  Orchestrator faz 1:1. Pra N robôs por task depois: adicionar `requiredRobots` na
  Task + mudar o loop - o banco não muda.

### Automação nível 2 - reativo (bloco F + E15) - FEITO (menos recarga)

O ciclo reativo funciona por **eventos internos** (EventEmitter2), desacoplando
quem detecta de quem age:

- `Enums/Events.Enum.ts` - `EventsCommands` (`robot.advertisement`,
  `robot.lost`), nomes dos eventos do barramento interno (backend-pra-backend).
- `SwarmService` **emite**: `robot.advertisement` a cada frame decodificado, e
  `robot.lost` uma vez quando um robô fica silencioso além do `LOST_LIMIT` (5s).
- `OrchestratorListener` (provider `@Injectable` na pasta do Orchestrator, **não
  um Controller** - `@OnEvent` não funciona em Controller) **escuta** os eventos
  e chama o `OrchestratorService`. Registrado nos `providers` do
  `OrchestratorModule`.
- Regras no `OrchestratorService`:
  - `handleRobotLost` → se o robô tinha task, solta ela pra fila (`Pending`) e
    marca o robô `Lost` (`handleLostRobot`).
  - `onAdvertisement` → se `waypoint_idx >= nº de waypoints`, conclui a task
    (`Completed`) e libera o robô. Se a bateria (mV/1000 → Volts) está abaixo do
    `LOW_BATTERY_VOLTS`, hoje só solta a task (placeholder - recarga adiada).

**Atribuição manual (SemiAuto)**: `OrchestratorController` expõe
`PUT /orchestrator/robots/:address/assign` (body `{ taskId }`). Faz o mesmo que
o loop automático, mas disparado por humano: valida (robô existe, não é Manual,
está livre), pega a task com waypoints, manda o comando e grava `taskId` +
`InProgress`. Reusa o `sendCommandToRobot` do próprio service.

**Bugs corrigidos junto** (auditoria): `handleRobotLost` chamava a si mesmo
(recursão infinita) - era pra chamar `handleLostRobot`; o `OrchestratorListener`
chamava métodos que não existiam no service e não estava registrado no módulo
(os `@OnEvent` não disparavam).

### Persistência de estado (bloco E, itens 13/14) - FEITO

O `SwarmService` é o **único escritor** do estado quente no Postgres, num job
periódico (1s, mesmo timer do `checkLost`), espelhando o
`_dotbots_status_refresh` do PyDotBot:

- **Status por `lastSync`**: recalcula `Active/Inactive/Lost` a partir do tempo
  de silêncio, com os limiares exatos do PyDotBot - `INACTIVE_DELAY = 5s`,
  `LOST_DELAY = 60s` (< 5s = Active, 5–60s = Inactive, > 60s = Lost). O status
  **nunca vem do robô**, é calculado.
- **Throttle de graça**: grava `status`/`battery`/`lastSync` só quando o status
  ou a bateria mudam desde a última gravação (guardado num `Map` em memória por
  address). Vários pacotes viram no máximo 1 write/robô/ciclo, e nada se o robô
  está parado. `battery` é gravada em **Volts** (o fio manda mV → divide por
  1000, igual PyDotBot).
- **Histórico de posição** (tabela `position`, via `PositionService`): grava a
  posição decodificada com throttle por **distância** - descarta se moveu menos
  que `LH2_DISTANCE_MM = 20` (LH2, mm) ou `GPS_DISTANCE_M = 5` (GPS, metros por
  haversine). Trata `DOTBOT_ADVERTISEMENT` (LH2, com guarda do sentinela
  `0xFFFFFFFF` = "sem localização") e `GPS_POSITION`. **Nota**: o PyDotBot só
  grava LH2 quando o robô está totalmente calibrado; esse gate ainda não existe
  aqui (não temos o estado de calibração no backend), só a guarda do sentinela.
- **WebSocket**: `emitStatus` empurra `robot:status` pro front quando o status
  muda (isso acontece SEM pacote novo - por timeout - então o front só fica
  sabendo por aqui; é o equivalente ao `RELOAD` do PyDotBot). Os nomes de evento
  do socket ficam no enum `SocketEvents` (`robot:update`, `robot:status`),
  separado do `EventsCommands` interno de propósito.

`SwarmModule` importa `RobotModule` + `PositionModule` (pra injetar
`RobotService`/`PositionService`); sem ciclo, porque nenhum deles importa o
`SwarmModule`.

### Armadilha resolvida: `useDefineForClassFields`

Com `target: ES2023`, o TS liga `useDefineForClassFields` por padrão, o que faz os
campos declarados nos models (`name`, `status`, `waypoints`, ...) virarem campos de
classe reais que **encobrem** os getters/setters do Sequelize → atributos e
associações vinham `undefined` (foi o bug do `task.waypoints` no Orchestrator).
**Corrigido** com `"useDefineForClassFields": false` no `tsconfig.json`. Se um dia
os atributos voltarem a vir `undefined` ou aparecer o warning "declaring public
class fields", é essa flag.

## Pendente (próximos passos)

Itens já concluídos, resumidos (histórico completo nas seções acima):
`Position.Model.ts`/`Task.Model.ts` + associações; CRUD genérico
(`Base*`) de Robot/Task/Position/User com DTOs/Schema/Guard; auth básica
usuário/senha com toggle `AUTH_ACTIVATED`; `IndexModule`;
`ApiResponseInterface` via interceptor/filter globais.

`TaskModel.priority` tem `@Default(0)` (model + `init.sql`) e é opcional no
`TaskCreateDto`/`TaskSchema` - só `name` é obrigatório pra criar uma task.

Tabela de referência opcional (`robot_applications`, `robot_control_modes`,
só pra legibilidade de SQL/relatório) segue de baixa prioridade, sem data.

**Objetivo combinado: nível 2 de automação** (ver "Objetivo: controle
manual + automatizado" acima) - o plano abaixo está ordenado por
dependência real, cada bloco precisa do anterior:

**Status dos blocos abaixo (ver seções "CONSTRUÍDO", "recebimento" e
"Automação nível 1" acima):**
- **Bloco A (Task com conteúdo): FEITO** - `status` + `task_waypoints` + seed.
- **Bloco C (Protocolo): FEITO** - frame + motor encode/decode + payloads + selectors.
- **Bloco D (Transporte): parcial** - interface (8) e `SimulatorGatewayAdapter` (10)
  FEITOS, com `onFrameReceived` ligado no SwarmService. Falta o transporte real via
  **Mari** (9) - ver seção "Rede Mari".
- **Bloco E (SwarmService): FEITO** - `Map` + `handleFrame` (11/12), job de status por
  `lastSync` (13), escrita throttled no Postgres (14) e emissão de eventos (15). Ver
  "Persistência de estado". (Falta só o gate de calibração LH2 pra gravar posição.)
- **Bloco F (Orchestrator): nível 1 e nível 2 FEITOS** (menos recarga) - atribuição
  automática task↔robô Auto + regras reativas (robô `Lost` solta a task, `waypoint_idx`
  no fim conclui) via `OrchestratorListener`. A regra de **bateria baixa** hoje é
  placeholder (só solta a task); a **recarga** foi adiada (ver "Adiado"). Ver
  "Automação nível 2".
- **Bloco G (WebSocket): FEITO** - `RobotWebsockets` empurra `robot:update` (a cada
  frame) e `robot:status` (quando o status muda por timeout) ao front.
- **Bloco H (Rotas): FEITO** - 5 comandos + `GET /status` + atribuição **manual**
  (`PUT /orchestrator/robots/:address/assign`, usada pelo SemiAuto). A atribuição
  automática segue no Orchestrator.
- **Próximos pedaços lógicos**: (a) transporte real via **Mari** (D); (b) **frontend**;
  (c) recarga (adiada, ver "Adiado"); (d) gate de calibração LH2 na gravação de posição.

### Adiado: comportamento de recarga (bateria baixa) - DECISÃO DE DESIGN PENDENTE

O dono do projeto decidiu **deixar a recarga pra depois** (precisa pensar no
modelo antes de implementar). Hoje o `OrchestratorService.onAdvertisement`, no
branch de bateria baixa (`batteryVolts <= LOW_BATTERY_VOLTS`, valor cru vem em
**mV**, divide por 1000 pra Volts), só faz `resetTask` - **solta a task de volta
pra fila e não faz nada com o robô**. Isso é um placeholder, não a recarga de
verdade.

Um protótipo de recarga chegou a ser escrito e **revertido** (estado `Charging`
no `RobotStatus`, estação como config `orchestrator.config.ts`, `startCharging`/
`finishCharging`, filtro do `getFreeRobots` excluindo `Charging`) - foi tudo
desfeito de propósito. Se for retomar, **não** copiar aquele protótipo cru:
ele tratava recarga como "um robô, uma estação infinita", que é justamente o
que está errado.

Questões de design a resolver ANTES de implementar (levantadas pelo dono):
- **Estações são recurso finito.** Se há N estações e mais de N robôs precisando,
  vira fila de espera *pela estação* - um mini-escalonador só pra recarga, não
  só um "vai pro ponto (x,y)".
- **Evitar corrida por estação.** Dois robôs mandados pra mesma estação ao mesmo
  tempo. Precisa "reservar"/ocupar a estação.
- **Saber quem já está carregando** pra não remandar, e quando liberar (histerese
  de bateria: entra no Charging abaixo de X V, só sai acima de Y V > X, pra não
  ficar oscilando).
- **Recarga é `Task` ou é estado do robô?** Se virar `Task` de verdade (waypoint =
  estação), entra no mesmo pipeline que já existe - mas precisa de prioridade alta
  e de reserva da estação. Se for só estado (`Charging`), é mais simples mas a
  gestão da estação fica por fora do pipeline de tasks.

Enquanto não for decidido, o branch de bateria baixa fica como está (só
`resetTask`). O `RobotControlMode.SemiAuto` e a atribuição manual
(`PUT /orchestrator/robots/:address/assign`) **não** dependem da recarga e já
estão prontos.

**A. Schema/model** (rápido, sem dependência de nada)
1. `TaskModel` ganha `status` (pendente/em_andamento/concluída/cancelada) -
   sem isso não dá pra saber quais tasks estão livres pra atribuir.
2. `TaskModel` ganha conteúdo de missão real: tabela `task_waypoints`
   (`task_id`, `order`, `x`, `y`) - sem isso não tem o que mandar pro robô.

**B. Dependências novas no `package.json`**
3. `serialport` - USB com o gateway de rádio (bloco D).
4. `@nestjs/websockets` + `socket.io` (ou `ws`) - bloco G.
5. `@nestjs/event-emitter` - desacopla `SwarmService` do `Orchestrator`
   (opcional, mas evita acoplamento direto entre as duas classes).

**C. Módulo `Protocol`** (mirror de `dotbot/protocol.py`)
6. Encode/decode dos payloads binários (`PayloadCommandMoveRaw`,
   `PayloadCommandRgbLed`, `PayloadDotBotAdvertisement`,
   `PayloadLH2Waypoints`, etc.) usando `Buffer`.
7. Frame wrapper (header + payload, endereçado por `address`).

**D. Módulo de transporte (`GatewayAdapter`)**
8. Interface comum (`send(address, payload)`, `onFrameReceived(callback)`).
9. `SerialGatewayAdapter` (hardware real via USB).
10. `SimulatorGatewayAdapter` (fake, pra testar sem hardware).

> **Controle manual já funciona só com C + D prontos** - não depende de
> `Task`/`SwarmService`/`Orchestrator` (blocos E/F) de jeito nenhum. Ou
> seja: dá pra testar `move-raw`/`rgb-led`/`waypoints` direto num robô
> específico (endereçado por `address`) assim que o Protocolo e o
> Transporte existirem, sem esperar a automação de tasks ficar pronta.
>
> **Ordem de teste recomendada**: construir C+D, testar o controle manual
> de ponta a ponta usando o `SimulatorGatewayAdapter` (sem precisar do
> robô físico o tempo todo) e só depois subir pra E/F/G (automação).

**E. `SwarmService`** (estado quente, mirror de `Controller.dotbots`)
11. `Map<address, RobotLiveState>` em memória.
12. Processa frame recebido: atualiza posição/bateria/`waypoint_idx`.
13. Job periódico (1s) recalculando status Active/Inactive/Lost a partir
    de `lastSync` (igual `_dotbots_status_refresh` do PyDotBot).
14. Throttling de escrita no Postgres (não grava a cada pacote bruto).
15. Emite eventos quando algo relevante muda (status mudou, bateria cruzou
    limite, `waypoint_idx` chegou no fim).

**F. `Orchestrator`** (peça nova, não existe no PyDotBot - é o "cérebro"
adaptativo pro nível 2, inspirado na ideia de orquestração do `swarmit`)
16. Escuta os eventos do `SwarmService`.
17. Atribuição automática por prioridade (nível 1), disparada por evento
    (task criada / robô ficou livre / robô novo entrou na rede).
18. Regras de nível 2: robô `Lost` com task → libera a task; bateria baixa
    → interrompe/retorna e libera a task; `waypoint_idx` no fim → marca
    task concluída e libera o robô.

**G. `RobotsGateway`** (WebSocket, mirror de `DotBotNotificationCommand`)
19. Emite pro front `NEW_DOTBOT`/`UPDATE`/`RELOAD` + eventos próprios
    (`TASK_REASSIGNED`/`TASK_COMPLETED`).
20. Recebe comando do front em tempo real (joystick manual via socket, não
    só REST).

**H. Rotas REST específicas do protocolo** (precisam de C+D pra funcionar
de verdade, não só retornar erro)
21. `GET /robots/:address`, `PUT /robots/:address/move-raw`, `/rgb-led`,
    `/waypoints`, `/control-mode` (mapeando `dotbot/server.py` - `address`,
    não `uuid`, porque são endereçadas fisicamente).
22. `PUT /robots/:address/task/:taskId` - atribuição manual de task, que
    também aciona o `Orchestrator` (bloco F).

## Rede Mari (transporte real - EM ESCOPO)

Decidido pelo dono do projeto: o sistema **tem** que funcionar com o robô e o
gateway **reais** - a Mari está no escopo, não é "trabalho futuro". Pesquisa
feita na fonte (pacotes `marilib` e repo `DotBots/mari`):

- **A parte de rádio (TSCH sobre BLE 2Mbps, channel-hopping) mora no FIRMWARE do
  gateway (nRF5340), NÃO no backend.** O host (nosso NestJS) só troca pacotes
  **enquadrados** com o gateway via **USB serial** (`/dev/ttyACM0`, 1000000 baud).
  Do nosso lado é enquadramento de bytes + serial, não rede de rádio - cabe em TS.
- **Pilha no fio (de dentro pra fora):** (1) nosso DotBot Packet (payloadType +
  body) = `next_proto DOTBOT_APP 0x11`; (2) **Mari Frame** - header próprio
  (`version=3`, `type`, `network_id(2)`, `destination(8)`, `source(8)`,
  `next_proto(1)`) + payload; (3) prefixo **EdgeEvent** (1 byte:
  `NODE_DATA`/`NODE_JOINED`/`NODE_LEFT`); (4) **HDLC** enquadrando tudo pro UART.
- **Pra falar com o gateway real**, um `MariGatewayAdapter` (implementando a
  interface `GatewayAdapter` - nada acima muda) precisa de: `serialport` (npm),
  codec **HDLC** (portar `serial_hdlc.py`), build/parse do **Mari Frame header**,
  e tratar os **EdgeEvent**. Nosso DotBot Packet entra como payload do Mari Frame.
  Dá pra **validar byte a byte contra o `marilib`** (gera no Python, compara),
  como já fizemos com o protocolo do DotBot.

**Decisão tomada: caminho A (TS puro).** O dono está reimplementando **na mão**
(exercício de aprendizado do TCC), validando cada peça **byte a byte contra o
`marilib`** (Python instalado no ambiente: `python3` importa `marilib`; gere o
frame de referência e compare com a saída do TS).

**Estrutura real dos arquivos** (nomes escolhidos pelo dono, diferentes de um
rascunho anterior):

```
src/Protocols/Mari/
  Hdlc/
    Fcs16Table.ts     - tabela CRC-16 (256 valores; constante do padrão, copiada exata)
    HdlcHelper.ts     - static frameCheckUpdate (FCS), escapeByte, unescapeStep
    HdlcCodec.ts      - hdlcEncode / hdlcDecode (frame completo de uma vez)
    HdlcHandler.ts    - máquina de estados byte-a-byte (Idle/Receiving/Ready) p/ a serial
    Hdlc.ts           - barrel (reexporta os 3)
  Mari.Protocol.ts    - classe MariProtocol: build/parseMariHeader (21B),
                        build/parseMariFrame, wrapEdgeEvent
  Mari.Payload.ts     - interfaces MariHeader / MariFrame
src/Enums/
  Hdlc.Enum.ts        - FLAG=0x7e, ESCAPE=0x7d, *_ESCAPED, FCS_INIT=0xffff, FCS_OK=0xf0b8
  HdlcState.Enum.ts   - Idle / Receiving / Ready
  NextProto.enum.ts   - DOTBOT_APP=0x11 (o nosso), MARI_INTERNAL=0x01, UNKNOWN=0xff
  EdgeEvent.enum.ts   - NODE_JOINED=1, NODE_LEFT=2, NODE_DATA=3, NODE_KEEP_ALIVE=4, GATEWAY_INFO=5
src/adapter/Mari/MariGateway.Adapter.ts  - o adapter (STUB - A FAZER, ver guia abaixo)
src/config/mari.config.ts                - { port, baudrate, networkId } via env
                                           MARI_PORT / MARI_BAUDRATE / MARI_NETWORK_ID
```

**Status por etapa:**
- **HDLC: FEITO e validado** - 8/8 doctests do marilib + round-trips + streaming
  em pedaços irregulares. (Bugs pegos no caminho: precedência no FCS `(fcs^byte)&0xff`,
  faltava a FLAG de fechamento no encode, `frame.length-1` no decode.)
- **Mari protocol: FEITO e validado** - header (7/7 vs marilib, 2 endereços) +
  frame + EdgeEvent + round-trip do `parseMariFrame`. (`destination` e `source` são
  8 bytes → string hex + `BigUInt64LE`; `networkId` é 2 bytes → `number`.)
- **`MariGatewayAdapter`: A FAZER** (hoje é stub) - guia completo abaixo.
- **GatewayModule toggle + `npm i serialport`: A FAZER** (Passo 4).

Os enums/vars de ambiente já estão no `.env` e `.env.example`: `GATEWAY_MODE`
(simulator|mari), `MARI_PORT`, `MARI_BAUDRATE=1000000`, `MARI_NETWORK_ID=0x0001`.

### Passo 3 - MariGatewayAdapter (guia pra retomar em qualquer máquina)

Vai em `src/adapter/Mari/MariGateway.Adapter.ts`. Implementa `GatewayAdapter`
(`send` + `onFrameReceived`) e `OnModuleInit` (abre a serial no boot). Junta o
`HdlcCodec` + `HdlcHandler` + `MariProtocol` + `serialport`.

```ts
@Injectable()
export class MariGatewayAdapter implements GatewayAdapter, OnModuleInit {
    private port: any = null;
    private readonly codec = new HdlcCodec();
    private frameCallback: ((frame: Buffer) => void) | null = null;
    private readonly hdlc = new HdlcHandler((p) => this.onEdgePayload(p));

    onModuleInit(): void { this.connect(); }

    private connect(): void {
        try {
            const { SerialPort } = require("serialport"); // lazy: nativo, só p/ modo mari
            this.port = new SerialPort({ path: mariConfig.port, baudRate: mariConfig.baudrate });
            this.port.on("data", (chunk: Buffer) => this.hdlc.push(chunk));
            this.port.on("error", (e: Error) => console.error("[MARI] serial:", e.message));
            this.port.on("open", () => console.log(`[MARI] conectado em ${mariConfig.port}`));
        } catch (error) {
            console.error("[MARI] não abriu a serial (serialport instalado? porta certa?)", error);
        }
    }

    send(destination: string, payloadType: PayloadType, body: Buffer): void {
        const packet = Buffer.concat([Buffer.from([payloadType]), body]); // DotBot Packet
        const header: MariHeader = {
            version: 3, type: 16, networkId: mariConfig.networkId,
            destination, source: "0000000000000000", nextProto: NextProto.DOTBOT_APP,
        };
        const frame = MariProtocol.buildMariFrame(header, packet);
        const hdlc = this.codec.hdlcEncode(MariProtocol.wrapEdgeEvent(EdgeEvent.NODE_DATA, frame));
        if (!this.port) { console.error("[MARI] serial não conectada"); return; }
        this.port.write(hdlc);
    }

    onFrameReceived(callback: (frame: Buffer) => void): void { this.frameCallback = callback; }

    private onEdgePayload(payload: Buffer): void {
        if (payload.length < 1 || payload[0] !== EdgeEvent.NODE_DATA) return;
        const mari = MariProtocol.parseMariFrame(payload.subarray(1));
        if (mari.header.nextProto !== NextProto.DOTBOT_APP) return;
        this.frameCallback?.(this.toInternalFrame(mari));
    }

    // Traduz o Mari frame pro formato interno de 18B (source@10 + payloadType@18)
    // que o SwarmService já lê - por isso Swarm/Robot/Orchestrator não mudam.
    private toInternalFrame(mari: MariFrame): Buffer {
        const header = Buffer.alloc(18);
        header.writeUInt8(1, 0);   // version
        header.writeUInt8(16, 1);  // type = DATA
        header.writeBigUInt64LE(BigInt("0x" + mari.header.destination), 2);
        header.writeBigUInt64LE(BigInt("0x" + mari.header.source), 10);
        return Buffer.concat([header, mari.payload]); // header + (payloadType + body)
    }
}
```

Imports: `Injectable`/`OnModuleInit` (@nestjs/common), `GatewayAdapter`, `PayloadType`,
`HdlcCodec`/`HdlcHandler` (de `Protocols/Mari/Hdlc`), `MariProtocol` +
`MariHeader`/`MariFrame`, `NextProto`/`EdgeEvent`, `mariConfig`.

Validar o `send` (cadeia inteira até o HDLC) contra o marilib, como no HDLC/protocolo.

### Passo 4 - ligar (o que falta pro hardware)

1. **`GatewayModule` escolhe por env** (hoje está fixo no Simulator):
   ```ts
   const GatewayAdapterClass =
       process.env.GATEWAY_MODE === "mari" ? MariGatewayAdapter : SimulatorGatewayAdapter;
   // providers: [{ provide: GATEWAY_ADAPTER, useClass: GatewayAdapterClass }]
   ```
2. **`npm i serialport`** no ambiente com o hardware (nativo; já está no `package.json`).
3. No `.env`: `GATEWAY_MODE=mari`, `MARI_PORT` (Windows: `COM3`), conferir `MARI_NETWORK_ID`
   com o firmware. Testar com o gateway físico.

> **Achado importante**: o `SerialAdapter` "cru" do PyDotBot (nosso frame de 18B do
> `Protocol.ts`) está **deprecado** - o gateway real hoje só fala Mari. Nosso frame
> de 18B agora é um formato **interno** (usado pelo simulador e pra alimentar o
> SwarmService); o que vai no fio real é o Mari frame.
>
> **Melhorias opcionais** (não feitas): tratar `GATEWAY_INFO` pra aprender o
> network_id dinamicamente, e usar `NODE_JOINED`/`NODE_LEFT` pra presença de nós.

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

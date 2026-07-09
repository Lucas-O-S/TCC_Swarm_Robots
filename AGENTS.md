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

Sobre funcionar **"de forma adaptativa"** (pergunta feita no chat) - a
resposta é "depende do nível", ainda nenhum foi implementado:

1. **Atribuição automática simples** (viável com o que já existe hoje,
   uma vez que `Task` ganhe conteúdo de missão - ver "Pendente"): o sistema
   escolhe automaticamente qual robô pega qual task pendente, com base em
   prioridade/status/bateria. É lógica de consulta ao Postgres, não precisa
   de nada em tempo real.
2. **Reativo/adaptativo de verdade** (precisa do `SwarmService` + WebSocket,
   itens 5/6 do "Pendente", ainda não construídos): o sistema reage a
   mudanças de estado *enquanto elas acontecem* - reatribui a task se o
   robô ficar `LOST` no meio, manda voltar pra carregar se a bateria cair
   demais, rebalanceia quando um robô novo entra na rede. Sem o estado
   quente em memória + os eventos de WebSocket, isso só dá pra fazer via
   polling do banco (funciona, mas não é "tempo real").
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

Itens já concluídos, resumidos (histórico completo nas seções acima):
`Position.Model.ts`/`Task.Model.ts` + associações; CRUD genérico
(`Base*`) de Robot/Task/Position/User com DTOs/Schema/Guard; auth básica
usuário/senha com toggle `AUTH_ACTIVATED`; `IndexModule`;
`ApiResponseInterface` via interceptor/filter globais.

Tabela de referência opcional (`robot_applications`, `robot_control_modes`,
só pra legibilidade de SQL/relatório) segue de baixa prioridade, sem data.

**Objetivo combinado: nível 2 de automação** (ver "Objetivo: controle
manual + automatizado" acima) - o plano abaixo está ordenado por
dependência real, cada bloco precisa do anterior:

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

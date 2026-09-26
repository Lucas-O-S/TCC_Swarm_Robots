# Frontend — TCC_Swarm_Robots

Contexto pra qualquer sessão do Claude (ou pessoa) que continue o front: o
que já foi feito, as decisões tomadas com o dono do projeto e o que está
pendente. Foco na tela de **Simulação** (`/simulacao`), que foi recriada e
ajustada em várias conversas. O contexto geral do projeto (backend,
protocolo, orquestrador) está no `AGENTS.md` do repositório principal.

## Como trabalhar com o dono do projeto

- **Ficar no escopo do pedido.** Se for fazer algo além, perguntar antes. Uma
  mudança que foi além do pedido (padronizar o visual dos drawers) foi
  revertida por ele.
- **Reutilizar, nunca copiar** (regra do dono, 2026-09-25). Fazer tudo de
  forma reutilizável sempre que der. Se algo que já existe for servir em outro
  lugar, adaptar o original pra ser reutilizado (extrair componente, hook ou
  helper; parametrizar por props) e fazer os dois lugares usarem a mesma peça
  — nunca duplicar código nem CSS. Adaptar código de outra tela pra reusar faz
  parte da tarefa e não precisa de pergunta.
- **Refatorações e limpezas sem relação com a tarefa: uma por vez**,
  perguntando antes de cada item.
- **Não fazer commit** sem ele pedir.
- Respostas em português, diretas.

## Stack e comandos

- React 19 + TypeScript ~6 + Vite 8, CSS Modules, react-router-dom 7.
- `tsconfig` com `erasableSyntaxOnly` (sem `enum`: usar objeto `as const`),
  `verbatimModuleSyntax` (`import type` pra tipos) e `noUnusedLocals`.
- `npm run dev` · checar tipos: `npx tsc -p tsconfig.app.json --noEmit` · lint: `npm run lint` (oxlint).
- `npm run build` falha por um erro **pré-existente** em
  `src/screens/map-test/MapTestScreen.tsx` (`obstacles` × `Obstacles`). Não é
  da Simulação.

## Padrão de pastas (camadas)

- `screens/<Tela>/` — a tela, o hook principal e helpers `use*.ts`, sem subpastas.
- `components/<Nome>/<Nome>.tsx` + `<Nome>.module.css` — cada componente com o
  seu CSS. Estilo que se repete vira peça compartilhada em vez de ser copiado
  (ver "Reutilizar, nunca copiar"). Módulos antigos ainda repetem `.field`,
  `.hint` etc.; ao mexer num deles, trocar pela peça compartilhada.
- `enums/*.enum.ts` (espelho do backend), `model/*.Model.ts` (interfaces
  terminam em `Model`), `services/*.Service.ts` (objeto literal),
  `mapper/*.Mapper.ts`, `Consts/`, `Integration/`, `hooks/`.
- Drawers entram pelo `<MapCanvas panel={...}>` e acham o que está
  selecionado com `useMapSelection()`.
- **Páginas espelhadas (pedido do dono):** o layout é [Menu | Mapa |
  Drawer] — Simulação, Construtor e Tarefas (`MapMenuLayout`) e Mapa &
  Conexão (lista à esquerda, mapa encostado na direita). Também foram
  espelhados: os grupos do header da Simulação (`SimulationControls`), as
  ferramentas do mapa (canto inferior esquerdo, `MapViewport`) e a escala
  (direito, `MapCanvas`), e o título/botões do Mapa & Conexão. Até 780 px
  (uma coluna só) volta a ordem normal: mapa primeiro, alinhado à esquerda.
- **Drawers (todas as telas):** abrem à direita, logo abaixo da barra de
  navegação, e empurram o conteúdo da tela pra esquerda (`padding-right` no
  `AppLayout`; em tela estreita, até 780 px, ficam por cima). O conteúdo de
  todos usa as peças de
  `components/Drawer/DrawerForm.tsx` (`DrawerBody`, `DrawerField`,
  `DrawerRow`, `DrawerHint`, `DrawerError`, `DrawerActions`,
  `DrawerSection`, `DrawerSubtitle`, `DrawerDivider`), com a aparência dos
  drawers da Simulação. O CSS de cada drawer fica só com o que é próprio dele.

## Tela de Simulação (`/simulacao`)

Recriada no padrão das outras telas (MapMenuLayout + MapCanvas + Menu +
ferramentas no canto do mapa + Drawer + modal de escolha de cenário), com a
lógica do projeto **RobotSwarmSimulator** portada.

Onde fica cada peça:

- `screens/Simulation/` — `Simulation.tsx` (tela), `useSimulation.ts` (ponte
  motor ↔ React), `SimulationMap`/`SimRobotMarker`/`SimOverlay`, o motor
  (`SimWorld`, `SimRobot`, `SimPhysics`, `SimWaypoints`, `SimLoop`,
  `SimGateway`, `SimNetModel`, `SwarmitDevice`) e helpers (`useScenarioEditor`,
  `useMapGeometry`, `useSimSelection`, `useCommitField`).
- `components/` — `SimulationControls` (header do topo), `SimRobotDrawer`
  (Simular), `SimRobotEditDrawer` (Editar), `SimObstacleDrawer`,
  `SimRobotList`/`SimRobotCard`, `SimTaskPanel`, `NetworkPanel`,
  `SwarmitPanel`, `GatewayLog`, `Joystick`, `Segmented`, `Badge`,
  `SelectSimulationScenarioModal`, `MenuColumns` (cartões do menu).
- Layout: os cartões do menu ficam no `MenuColumns` — quantas colunas de
  300 px couberem, cada coluna empilhando os seus cartões (a grade antiga
  alinhava por linha e deixava buraco embaixo do cartão mais baixo). O mapa
  usa `<MapMenuLayout stickyMap>`: acompanha a rolagem acima de 780 px (numa
  coluna só ele cobriria o menu). As outras telas não usam: o menu delas não
  rola.
- `Integration/` — `FleetLink` (contrato), `LocalFleetLink` (backend local,
  offline), `LocalOrchestrator` (porte do `Orchestrator.Service` do backend),
  `MqttFleetLink` (pronto, não ligado) e `Protocols/` (DotBot, Mari, Swarmit).
- `services/Simulation.Service.ts` (cenários de exemplo, cenário em branco,
  importar .json, **tarefas mock**), `mapper/Scenario.Mapper.ts`,
  `mapper/SimRobot.Mapper.ts`, `model/Scenario|SimRobot|SimWorld.Model.ts`,
  `Consts/SimulationConsts.ts`.

### Decisões

- **Offline.** Ainda não há API: o gateway simulado conversa com o
  `LocalFleetLink`, que faz o papel do backend. Ele marca o robô como Active
  (menos de 5 s sem telemetria), Inactive (5–60 s) ou Lost (mais de 60 s).
  Pra ligar na API, trocar pelo `MqttFleetLink` em `useSimulation.ts`; o
  contrato é o mesmo. O botão "Conectar à API" fica desabilitado.
- **Unidades:** mundo em mm com Y pra cima e origem no canto inferior
  esquerdo; conversão pra px só em `useMapGeometry.ts`. 1 célula = 200 mm
  (`CELL_MM`, derivado de `BLOCK_SIDE_M`). A célula é sempre quadrada.
- **Dois enums de modo.**
  - `DotBotControlMode` (modo no fio do firmware): Manual = 0, Auto = 1.
  - `RobotControlMode` (modo de orquestração do backend): Auto = 0,
    Manual = 1, SemiAuto = 2.
- **Header:** os controles (cenário, Editar/Simular, Pausar/Reiniciar,
  Importar/Exportar, API) ficam num header acima do mapa e do menu, pelo
  campo opcional `header` do `MapMenuLayout`.
- **Modos no drawer do robô (Simular)** — cada modo mostra só as próprias opções:
  - **Manual:** joystick + rota avulsa (monta pontos no mapa com a ferramenta
    Waypoint e usa "Enviar rota"/"Reenviar atual", com raio de chegada).
  - **Semi-auto:** escolher uma tarefa pendente, com a rota dela em rosa no
    mapa antes de atribuir, e clicar Atribuir. Com tarefa em andamento:
    progresso, **Cancelar** (o robô para e a tarefa volta pra fila como
    pendente) e **Trocar** por outra pendente (segue a nova de onde está).
  - **Auto:** entra na fila; a cada 5 s o orquestrador dá a tarefa pendente
    de menor prioridade a um robô Auto livre.
  - Modo inicial: robô MANUAL no cenário começa em Manual; robô AUTO começa
    em **Semi-auto**. Auto é escolha do usuário, pra fila não trocar a rota
    do cenário por uma tarefa nos primeiros 5 s.
- **Tarefas: esta tela NÃO cria, edita nem apaga tarefa** (regra do dono;
  isso é da tela Tarefas/API). Ela só puxa e seleciona. Offline, as tarefas
  vêm de `SimulationService.createMockTasks(scenario)`, com rotas em frações
  da arena que não cruzam barreira. São puxadas de novo, todas pendentes, a
  cada início e Reiniciar. Com a API, vira `TaskService.list()`. O cartão
  "Tarefas" é só leitura: clicar numa tarefa mostra a rota dela no mapa.
- **Orquestrador local:** diferenças deliberadas em relação ao backend estão
  marcadas com `DIFERENÇA` no `LocalOrchestrator`:
  - conclusão só conta com o robô no último ponto da tarefa;
  - a atribuição confere se a tarefa está pendente;
  - ir pra Manual devolve a tarefa pra fila;
  - Cancelar/Trocar no Semi-auto;
  - o modo inicial vem do modo do fio.
- **Joystick** (`components/Joystick`):
  - de arrastar, como em jogo de celular; a direção do joystick é a direção
    no mapa e o robô gira sozinho até apontar pra ela;
  - manda CMD_MOVE_RAW a 20 Hz; ao soltar, manda parada algumas vezes, caso
    a rede perca uma;
  - o log agrupa o fluxo numa linha com ×N.
- **Rotas no mapa** usam o `RobotPath` (o mesmo do TaskBuilder) com
  `units="px"`, `from` (sai da posição do robô), `reachedCount` (pontos
  alcançados em cinza) e `markers`:
  - Simular: mesmo desenho da tela de Tarefas (linha com setas + `<Waypoint>`
    numerado), na cor de cada robô;
  - Editar: tracejada com círculos numerados;
  - rascunho da rota avulsa em laranja e preview de tarefa em rosa
    (`#d63384`), tracejados (o dono pediu pra manter o preview assim por enquanto).
- **Swarmit:** com a camada ligada, robô fora de Running fica parado, não
  manda telemetria e ignora comandos, igual ao hardware.
- Cenário `.json` no mesmo formato do RobotSwarmSimulator (importa e exporta
  entre os dois).

### Peças compartilhadas (limpeza de duplicados, feita item a item)

- `clamp` exportada do `SimPhysics.ts`.
- `num` (lê campo numérico) em `components/SimRobotDrawer/numInput.ts`.
- `SimRobotMapper.statusLabel()` pros rótulos Active/Inactive/Lost.
- `useCommitField` (campo que confirma no blur/Enter e volta o valor se der
  erro): nome da barreira e endereço do robô.
- `ROBOT_SIZE` exportado do `components/Robot/RobotProp.tsx` (TaskRobot e
  SimRobotMarker).
- `Segmented` também é usado pelo `AreaDrawer` (TaskBuilder), em laranja; os
  botões de canto do AreaDrawer continuam amarelos, são outro controle.
- `ObstacleDrawerBase` (`components/ObstacleDrawer/`): seleção, título e
  seleção múltipla do `ObstacleDrawer` (CenarioBuilder, em células) e do
  `SimObstacleDrawer` (Simulação, em mm). Os campos continuam com cada um.
- `RobotPath` ganhou `units`, `from`, `reachedCount` e `markers`. O padrão
  continua igual pro TaskBuilder e pro MapTestScreen.

### Drawers unificados

Pedido do dono: todos os drawers com a mesma estrutura (`DrawerForm`) e a
aparência dos drawers da Simulação — SimRobotDrawer, SimRobotEditDrawer,
SimObstacleDrawer, ObstacleDrawer (Construtor), WaypointDrawer e AreaDrawer
(Tarefas). Antes disso, uma padronização no sentido contrário (simulador
imitando as outras telas) tinha sido revertida por ele.

### Pendências e achados

- API não conectada: o `MqttFleetLink` está pronto, mas não está ligado na UI.
- Joystick com a API real: vai depender do `direction` da telemetria perto de
  20 Hz; hoje `advertise_hz` = 2 no simulador.
- Backend real:
  - `onAdvertisement` pode concluir a tarefa na hora, se chegar uma
    telemetria antiga da rota anterior;
  - `assignTaskManually` não confere se a tarefa está pendente.
- Pré-existentes, não mexidos:
  - renomear a barreira fecha o drawer;
  - no celular a barra de navegação do app estoura a largura;
  - a roda do mouse em cima do mapa dá zoom e também rola a página (o
    `onWheel` do React é passivo, então o `preventDefault` do `MapViewport`
    não vale e aparece um erro no console). Com o mapa grudado na Simulação
    isso fica mais visível;
  - em mapa estreito (Teste Mapa, celular) a escala cobre parte das
    ferramentas.
- O cenário só guarda modo inicial Manual/Auto (Semi-auto só durante a
  simulação).

## Tela do Visualizador (`/visualizador`)

Pedido do dono (2026-09-25): parecida com a Simulação, mas sem customização e
sem simular nada. Roda ligada na rede, só com cenário pronto e só com os robôs
que vierem da API, que dá pra acompanhar e comandar do mesmo jeito que na
Simulação. **Por enquanto é só a tela**: a conexão com a API ainda não existe
(pedido do dono: deixar as portas abertas, sem implementar a conexão).

Onde fica cada peça:

- `screens/Visualizer/` — `Visualizer.tsx` (tela), `useVisualizer.ts` (ponte
  API ↔ React), `VisFleet.ts` (a frota como a API mostra, fora do React:
  registro, telemetria, rastro, tarefas e log) e `VisualizerMap.tsx` (mapa).
- `components/` — `VisualizerControls` (header), `SelectVisualizerScenarioModal`,
  `VisRobotList`/`VisRobotCard`, `VisTaskPanel`, `VisRobotDrawer` (+
  `joystickDrive.ts`). Da Simulação reaproveita `SimOverlay`, `SimRobotMarker`,
  `useMapGeometry`, `useSimSelection`, `GatewayLog` (vira o log da API),
  `Joystick`, `Segmented` e `Badge`.
- `Integration/ApiLink.ts` (contrato) + `Integration/DisconnectedApiLink.ts`
  (o link que não conecta), `enums/SocketEvents.enum.ts` (espelho do backend),
  `model/RobotTelemetry.Model.ts`, `model/VisRobot.Model.ts` e
  `mapper/VisRobot.Mapper.ts`.

### Decisões

- **Porta pra API:** tudo passa pelo `ApiLink` (o papel do FleetLink na
  Simulação). Hoje é o `DisconnectedApiLink`: avisa "sem conexão", não emite
  evento e todo comando volta com erro, então a tela abre só com o mapa, sem
  robôs. Pra ligar, é escrever a implementação real (REST pelo `Callout` +
  socket.io nos eventos `robot:update`/`robot:status`/`robot:new` do
  `RobotWebsockets`) e trocar a linha marcada em `useVisualizer.ts`. As rotas e
  os eventos estão no contrato, conferidos no backend. Vai precisar do
  `socket.io-client`, que ainda não está instalado.
- **Cenário:** só pronto. "Salvos" fica desabilitado (a API não tem rota de
  cenário, só os models `Cenario`/`Obstacle`); a única opção é o mapa mock do
  Construtor, sem robôs.
- **Blocos como na tela de gerar mapa** (escolha do dono): cenário em células,
  célula esticando pra preencher a altura (`fitWidth` + `maxHeight`) e
  obstáculos por célula. A telemetria (mm, Y pra cima) vira px pela escala de
  cada eixo, e a seta do robô é corrigida pro esticamento (`screenTheta` no
  `VisualizerMap`) pra apontar pra onde ele anda na tela. No celular o mapa
  passa da largura, igual ao Construtor e às Tarefas.
- **Robôs:** só os da API (`GET /robots` + `robot:new`), com rótulos R1, R2…
  na ordem em que aparecem. Pose, rumo (`direction`; -1 = sem leitura),
  bateria (mV) e modo do fio vêm do advertisement; posição `0xFFFFFFFF` = sem
  localização (o robô só aparece na lista). O status é o que o backend calcula
  (`robot:status`). O endereço vai como a API devolve (hex minúsculo).
- **Drawer** = o do modo Simular sem o que é do mundo simulado
  (derrubar/religar, swarmit):
  - Modo (Manual/Semi-auto/Auto) → `PUT /robots/:address/control-mode`;
  - Manual: joystick (CMD_MOVE_RAW a 20 Hz pela API, usando o rumo da
    telemetria) + rota avulsa (`PUT /robots/:address/waypoints`);
  - Semi-auto: escolher tarefa pendente + Atribuir
    (`PUT /orchestrator/robots/:address/assign`). Cancelar/Trocar no meio não
    existem na API;
  - Auto: só acompanhar;
  - raio de chegada (`PUT /robots/:uuid`) e LED (`PUT /robots/:address/rgb-led`).
- **Rota desenhada:** a da tarefa (quando a API mandar os pontos) ou a última
  avulsa mandada desta tela; sem nenhuma, só o alvo atual do advertisement.

### Pendências

- Backend (achado ao montar a tela): a rota `control-mode` existe, mas não foi
  implementada. Ela só manda o byte pro robô, cru (Auto=0 vira MANUAL no
  firmware; Semi-auto=2 não existe no fio), e não grava `robots.mode`; o
  `RobotUpdateDto` também não aceita `mode`. Resultado: todo robô continua
  Manual pro orquestrador.
- Backend: `GET /tasks` não inclui os waypoints (o `getAll` não faz include),
  então o mapa não desenha a rota da tarefa e não dá pra filtrar "tem pontos".
- Front: o controlador do joystick está duplicado (`SimRobotDrawer` e
  `VisRobotDrawer/joystickDrive.ts`). Unificar é uma limpeza pendente
  (perguntar antes).

## Ambiente (Cowork)

- `git status` pela VM do Cowork deixa `.git/index.lock` preso — usar
  `git --no-optional-locks status`.
- A permissão de apagar arquivos no Cowork não vale de um dia pro outro;
  pedir de novo quando precisar.

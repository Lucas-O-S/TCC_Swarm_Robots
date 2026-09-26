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
- **Refatorações e limpezas: uma por vez**, perguntando antes de cada item.
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
  seu CSS (repetir `.field`, `.hint` etc. por módulo é o padrão da casa,
  exceto nos drawers — ver abaixo).
- `enums/*.enum.ts` (espelho do backend), `model/*.Model.ts` (interfaces
  terminam em `Model`), `services/*.Service.ts` (objeto literal),
  `mapper/*.Mapper.ts`, `Consts/`, `Integration/`, `hooks/`.
- Drawers entram pelo `<MapCanvas panel={...}>` e acham o que está
  selecionado com `useMapSelection()`.
- **Drawers (todas as telas):** abrem à esquerda, logo abaixo da barra de
  navegação, e empurram o conteúdo da tela pra direita (em tela estreita, até
  780 px, ficam por cima). O conteúdo de todos usa as peças de
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
  `SelectSimulationScenarioModal`.
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
  - no celular a barra de navegação do app estoura a largura.
- O cenário só guarda modo inicial Manual/Auto (Semi-auto só durante a
  simulação).

## Ambiente (Cowork)

- `git status` pela VM do Cowork deixa `.git/index.lock` preso — usar
  `git --no-optional-locks status`.
- A permissão de apagar arquivos no Cowork não vale de um dia pro outro;
  pedir de novo quando precisar.

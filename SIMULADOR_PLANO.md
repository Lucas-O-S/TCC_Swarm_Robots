# Simulador de Enxame — Parecer de Viabilidade + Plano de Arquitetura

> Documento de planejamento. Nenhum código foi escrito ainda — este é o
> "parecer + plano" pedido antes de construir. Fonte de verdade das decisões
> de arquitetura fica no `AGENTS.md`; este arquivo detalha especificamente o
> **simulador**.

## 1. Parecer: é possível? Sim.

E não é um "sim" otimista — é um caminho que o próprio projeto DotBots já
validou. Três pontos concretos sustentam isso:

1. **A arquitetura foi desenhada exatamente pra permitir isso.** O DotBot
   separa em três camadas: `controller` (estado da frota + API) →
   `gateway` → `radio` → robôs. O ponto de troca natural é o **gateway**.
   Como o seu backend já replica essa separação (`src/Protocol/`, camada de
   transporte, controller), o simulador entra no lugar de *gateway + robôs*:
   fala o mesmo protocolo/mensagens, e o backend não precisa saber que do
   outro lado tem software em vez de hardware.

2. **O PyDotBot já tem um simulador embutido** (`dotbot run simulator`), com
   UI web, mapa ao vivo e joystick, rodando com zero hardware. Ou seja, o
   conceito central já existe e funciona — você vai reimplementá-lo plugado
   no *seu* backend NestJS em vez do control plane Python deles.

3. **O próprio protocolo binário reserva uma mensagem só pro simulador:**
   `PayloadType.DOTBOT_SIMULATOR_DATA = 0xFA`, com os campos `theta`,
   `pos_x`, `pos_y`. Isso é prova de que "robô simulado que reporta pose" é um
   cidadão de primeira classe no design do DotBot, não uma gambiarra.

O que você descreveu (robôs como pontos num grid, barreiras como retângulos,
cinemática simples) é **baixa fidelidade de propósito** — muito mais fácil que
um simulador físico realista. O esforço real está em três frentes: (a) o
modelo de movimento/comportamento, (b) o adaptador que conversa com "a API que
você quiser", e (c) o editor de cenário. Tudo viável.

### Ponto de atenção honesto

O requisito "reproduzir **exatamente** o comportamento esperado" tem um teto:
o simulador só é fiel na medida em que consome/emite os **mesmos payloads** do
robô/gateway físico. Paridade byte-a-byte do protocolo binário é trabalho de
engenharia (não de pesquisa), e depende de o encode/decode do seu
`src/Protocol/` estar completo. Enquanto ele não estiver, dá pra trafegar os
mesmos *campos* em JSON e trocar pro binário depois — a modelagem não muda.

## 2. Decisões já tomadas (do chat)

| Pergunta | Decisão |
| --- | --- |
| Stack / onde vive | **Web, na pasta `Frontend/` (TypeScript)** |
| Visualização | **2D topo (grid)** — robôs como pontos/setas, barreiras como retângulos |
| Conexão ao backend | **A recomendar** — ver seção 4 |
| Entrega agora | **Só a análise/plano** (este documento) |

## 3. Onde o simulador se encaixa

```text
┌─────────────┐        ┌──────────────────┐        ┌───────────────────────────┐
│  Frontend   │        │  Backend NestJS  │        │   SIMULADOR (novo)        │
│  operador   │        │  (o "controller")│        │  gateway + frota emulados │
│  UI/joystick│─REST/WS▶│  estado da frota │◀─REST/WS▶│  física 2D + protocolo    │
└─────────────┘        │  RobotController │        │  editor de cenário        │
                       │  RobotsGateway   │        │  robôs = pontos no grid   │
                       └──────────────────┘        └───────────────────────────┘
        ╰──────────── seu sistema ────────────╯     ╰── substitui rádio+hardware ──╯
```

No mundo real: `controller → serial/MQTT → gateway → rádio → 🤖🤖🤖`.
O simulador substitui tudo à direita do controller. Para o backend, ele é
indistinguível de uma frota física reportando pose/status e obedecendo
comandos.

Detalhe importante de escopo: o **editor de cenário e a visualização** são do
simulador, não do seu app de operador. São duas UIs diferentes que podem
até compartilhar componentes, mas têm donos distintos — o operador comanda a
frota; o simulador *é* a frota.

## 4. Recomendação de conexão

Havia dois caminhos coerentes. Recomendo o **A**, com uma ressalva de design
que preserva o B pro futuro.

### Recomendado — A) Simulador como **cliente WebSocket/REST** do backend

O simulador conecta na API do backend como se fosse a frota: **recebe**
comandos (move-raw, waypoints, rgb-led, control-mode) e **envia** de volta
pose (x/y/θ) e status (`DotBotStatus`, bateria). Trocar a API =
trocar a `baseURL`/endpoints num arquivo de config.

Por que este:

- **É o que "trocar a API que eu quiser" pede.** O requisito está formulado em
  termos de *API* (HTTP/WS), não de transporte serial/MQTT. Apontar pra outra
  URL é trivial; reconfigurar um broker MQTT não é.
- **Casa com o `RobotsGateway` (WebSocket) que você já planeja.** O canal de
  tempo real do backend passa a ter um produtor/consumidor real pra exercitar
  — útil pro TCC mostrar o sistema ponta-a-ponta.
- **Desacopla o simulador do transporte interno do backend.** Você pode mudar
  serial↔MQTT lá dentro sem tocar no simulador.
- **Roda 100% no navegador**, coerente com a escolha de stack (Frontend/ TS).

### Alternativa — B) Simulador como **camada de transporte/gateway**

O simulador implementa o transporte que o backend plugaria no lugar do gateway
físico (ex.: um adapter estilo o `serial/MQTT` do PyDotBot, assinando os
mesmos tópicos). É a opção **mais fiel ao hardware**, porque intercepta o
protocolo exatamente no mesmo ponto que o gateway real. Custo: acopla ao
transporte interno e normalmente não roda só no browser (precisa de um
processo que fale MQTT/serial).

### Ressalva de design (o melhor dos dois)

Defina no simulador uma **interface `FleetLink`** com uma única
responsabilidade: "receber comandos" e "publicar telemetria". A implementação
padrão é a **A (WebSocket/REST client)**. Se um dia o TCC exigir fidelidade de
transporte, escreve-se uma segunda implementação **B (MQTT)** sem tocar no
núcleo de física nem no editor. Isso espelha o `dotbot/adapter.py` do
PyDotBot, que já troca serial/MQTT/simulador atrás de uma mesma interface.

## 5. Componentes do simulador

```text
Frontend/
  simulator/
    core/            # núcleo independente de UI e de transporte
      World.ts       # arena, grid, lista de obstáculos, passo de tempo (tick)
      Robot.ts       # estado + cinemática de um robô
      physics.ts     # integração de movimento + colisão com barreiras
      scenario.ts    # (de)serialização do cenário (JSON)
    protocol/        # espelha src/Protocol do backend (mesmos campos/enums)
      payloads.ts    # PayloadCommandMoveRaw, LH2Waypoints, DotBotAdvertisement...
      codec.ts       # (fase 2) encode/decode binário p/ paridade real
    link/            # comunicação — a interface FleetLink
      FleetLink.ts   # interface: onCommand(cb), publishTelemetry(state)
      WsRestLink.ts  # impl A (recomendada): cliente WebSocket + REST
      MqttLink.ts    # impl B (futura, opcional)
    ui/              # React (2D topo)
      MapView.tsx    # render do grid, robôs, barreiras (Canvas/SVG)
      ScenarioEditor.tsx  # desenhar/mover/redimensionar barreiras e robôs
      Inspector.tsx  # telemetria por robô, botões, config da API
```

### 5.1 Núcleo de simulação (`core/`)

- **Loop de tempo (tick):** avança o mundo em passos fixos (ex.: 20–50 Hz).
  Cada tick: aplica comandos pendentes → integra movimento → resolve colisão →
  emite telemetria no ritmo configurado.
- **Modelo do robô:** o DotBot é um veículo de tração diferencial (duas rodas).
  Estado mínimo: `pos_x`, `pos_y`, `theta` (heading), velocidades das rodas
  (`pwm_left`/`pwm_right` ou encoders), `battery`, `status`, `mode`. Isso
  mapeia direto nos campos do `PayloadDotBotAdvertisement` real.
- **Dois modos de controle** (batendo com `ControlModeType`):
  - **MANUAL** → obedece `CMD_MOVE_RAW` (joystick: `left_x/left_y/right_x/right_y`).
  - **AUTO** → segue uma lista de `LH2_WAYPOINTS` (com `threshold` de chegada),
    avançando `waypoint_idx` conforme alcança cada ponto.
- **Colisão (baixa fidelidade):** robô = ponto (ou círculo pequeno); barreira =
  retângulo (AABB). Ao colidir, bloqueia o movimento naquele eixo/tick. Simples
  e suficiente pro objetivo.
- **Bateria:** decai com o tempo/uso; permite testar o comportamento reativo
  (ex.: robô vira `LOST`/volta a carregar) previsto no `AGENTS.md`.

### 5.2 Editor de cenário (`ui/ScenarioEditor.tsx`)

- Grid quadriculado com dimensões e resolução configuráveis.
- **Barreiras:** desenhar/arrastar/redimensionar retângulos (os "cubos de
  tamanhos variáveis", em vista 2D de topo). Cada uma tem posição + tamanho.
- **Robôs:** posicionar pontos iniciais, definir `address`, `application`,
  `mode`, heading inicial.
- **Salvar/carregar** o cenário como JSON (ver seção 7) — permite montar,
  versionar e reusar cenários de teste.

### 5.3 Camada de comunicação (`link/`)

Interface única `FleetLink`; implementação padrão `WsRestLink` (opção A).
Toda a config da API (URL base, rota de comando, canal de telemetria, formato)
fica isolada aqui — é o único ponto a mexer pra "apontar pra outra API".

## 6. Paridade de protocolo (o que precisa bater)

Baseado no `dotbot/protocol.py` real do PyDotBot. O simulador precisa
**consumir** (comandos do controller → robô) e **produzir** (robô → controller)
estes tipos:

| Direção | `PayloadType` | Campos-chave | Papel no simulador |
| --- | --- | --- | --- |
| Consome | `CMD_MOVE_RAW` (0x00) | `left_x, left_y, right_x, right_y` | joystick no modo MANUAL |
| Consome | `CMD_RGB_LED` (0x01) | `red, green, blue` | cor do robô no mapa |
| Consome | `CONTROL_MODE` (0x07) | `mode` | alterna MANUAL/AUTO |
| Consome | `LH2_WAYPOINTS` (0x08) | `threshold, count, waypoints[x,y]` | rota no modo AUTO |
| Produz | `DOTBOT_ADVERTISEMENT` (0x06) | `calibrated, direction, pos_x, pos_y, battery, pwm_l/r, mode, encoders, waypoint_*` | telemetria completa do robô |
| Produz | `DOTBOT_SIMULATOR_DATA` (0xFA) | `theta, pos_x, pos_y` | pose enxuta — mensagem que o protocolo já reserva pro simulador |
| Produz | `ADVERTISEMENT` (0x04) | `application` | robô entrando na rede |

Enums a manter idênticos ao backend (`src/Protocol/Enums/`): `ApplicationType`
(0=DotBot…4=LH2_mini_mote), `ControlModeType` (0=Manual, 1=Auto), e
`RobotStatus`.

**Estratégia de fidelidade em duas fases:**

1. **Fase JSON:** trafega os mesmos *campos/nomes/enums* acima em JSON sobre
   WebSocket. Rápido de implementar, já valida toda a lógica ponta-a-ponta.
2. **Fase binária:** implementa `codec.ts` (encode/decode) espelhando o
   `src/Protocol/` do backend, atingindo paridade byte-a-byte. A modelagem de
   dados não muda — só a serialização na borda.

## 7. Modelo de dados do cenário (rascunho JSON)

```jsonc
{
  "version": 1,
  "arena": { "width_mm": 4000, "height_mm": 4000, "grid_mm": 100 },
  "obstacles": [
    { "id": "wall-1", "x_mm": 1000, "y_mm": 500, "w_mm": 200, "h_mm": 1500 }
  ],
  "robots": [
    {
      "address": "BDF2B04BC00D2725",
      "application": 0,          // ApplicationType.DotBot
      "mode": 0,                 // ControlModeType.MANUAL
      "start": { "x_mm": 200, "y_mm": 200, "theta_deg": 90 },
      "battery": 100
    }
  ],
  "sim": { "tick_hz": 50, "telemetry_hz": 10, "battery_drain_per_min": 1.0 }
}
```

Unidades em milímetros pra bater com o mundo LH2 do DotBot (posições x/y em
`length=4` bytes no protocolo). `address` em hex de 16 chars, como no
`init.sql` (`VARCHAR(16)`).

## 8. Stack técnica recomendada

Coerente com a escolha "Web no Frontend/ (TS)" e com o próprio PyDotBot (que
usa React + TypeScript + Vite):

- **React + TypeScript + Vite** — mesma base do PyDotBot; fácil de justificar
  no TCC.
- **Render 2D:** Canvas 2D puro ou SVG pra começar (grid + retângulos + pontos
  é leve). Se a interação de arrastar/redimensionar ficar pesada, considerar
  uma lib de canvas (ex.: Konva) — decisão adiável.
- **Estado da UI:** algo simples (Zustand ou Context) — o estado "quente" da
  simulação vive no `core/`, não no framework.
- **Comunicação:** WebSocket nativo do browser + `fetch` pro REST.
- **Núcleo `core/` sem dependência de React** — assim dá pra rodar a física
  em teste unitário (headless) e, se quiser, num Web Worker pra não travar a UI.

## 9. Roadmap incremental

1. **Núcleo headless:** `World` + `Robot` + `physics`, 1 robô obedecendo
   `move-raw`, sem UI. Teste unitário do movimento.
2. **Mapa 2D read-only:** desenhar grid + robô + barreiras a partir de um JSON
   fixo; ver o robô andar.
3. **Editor de cenário:** desenhar/mover/redimensionar barreiras e robôs;
   salvar/carregar JSON.
4. **`FleetLink` + `WsRestLink`:** conectar ao backend, receber comandos,
   publicar telemetria (JSON). Ponta-a-ponta com o `RobotsGateway`.
5. **Modo AUTO + waypoints + colisão + bateria:** comportamento completo de
   frota; múltiplos robôs.
6. **Paridade binária (`codec.ts`)** espelhando `src/Protocol/`. Opcional:
   `MqttLink` (opção B) pra fidelidade de transporte.

Cada fase é demonstrável sozinha — bom pro TCC e pra não travar tudo numa
dependência do backend que ainda não existe.

## 10. Riscos e pré-requisitos

- **`RobotsGateway` (WebSocket) e `SwarmService` ainda não construídos** no
  backend (marcados como pendentes no `AGENTS.md`). A Fase 4 depende de pelo
  menos um canal de comando/telemetria existir. Mitigação: Fases 1–3 não
  dependem do backend; dá pra adiantar tudo isso.
- **Contrato da API precisa ser fixado** antes da Fase 4: rota/evento de
  comando, evento de telemetria, formato (JSON agora, binário depois).
  Recomendo escrever esse contrato como uma seção nova no `AGENTS.md`.
- **`Task` ainda não tem conteúdo de missão** — o modo AUTO "de verdade"
  (atribuição/execução) depende disso. Pro simulador, waypoints avulsos já
  bastam pra demonstrar movimento autônomo.
- **Tempo real x tick:** manter física em passo fixo e telemetria com taxa
  separada evita saturar o WebSocket e mantém o movimento estável.
- **Paridade só é garantida** quando o encode/decode dos dois lados
  (`src/Protocol/` e `simulator/protocol/`) estiver alinhado; até lá, a fase
  JSON mantém os mesmos campos pra transição ser mecânica.

## 11. Próxima decisão sua

Se aprovar este plano, o passo natural é a **Fase 1** (núcleo headless com
teste) — não depende do backend e já prova o movimento. Antes disso, vale
fechar o **contrato da API** (seção 10) pra Fase 4 não travar depois.

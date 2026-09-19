# Arquitetura: gateway digital + digital twin bidirecional

Decisões tomadas pelo dono em 2026-09-01, que este documento desenvolve:

1. **O gateway digital assume a serial.** Um processo separado abre a porta,
   faz HDLC + Mari + DotBot packet e publica NGSI-LD. O backend NestJS deixa de
   falar binário com o hardware.
2. **O alvo é digital twin bidirecional completo** (Kritzinger et al., 2018):
   físico→digital *e* digital→físico automáticos. Sombra digital não basta.

Complementa `FIWARE_ANALISE.md` (o que é o FIWARE e por que Orion-LD) e
`FIRMWARE_ANALISE.md` (o embarcado). Aqui é o desenho do sistema.

---

## 1. Visão geral

```
                          ┌──────────────── CAMADA DE CONTEXTO ────────────────┐
                          │                                                    │
   DotBot ~~rádio Mari~~ Gateway físico ──USB/HDLC──> GATEWAY DIGITAL ────────>│ Orion-LD ──> Mintaka
   (nRF5340)              (nRF5340DK)                 (processo novo)          │  (NGSI-LD)   TimescaleDB
       ^                                                   │  ^                │    │ ^
       │                                                   │  │                └────┼─┼──────────────────┘
       │                                                   │  │ canal LIVE          │ │ subscriptions
       │                                                   │  │ (binário/WS,        v │
       └───────────────── comando de rádio ────────────────┘  │  malha rápida)   BACKEND NestJS
                                                              └──────────────────  (Swarm, Orchestrator,
                                                                                    Task, WebSocket, Postgres)
                                                                                         │
                                        RobotSwarmSimulator (twin preditivo) <───────────┘
```

Duas fronteiras, de propósito:

- **Canal twin (NGSI-LD/HTTP)** — estado da frota, comandos de alto nível,
  histórico, interoperabilidade. Passa pelo Orion-LD.
- **Canal live (binário direto, WebSocket ou MQTT)** — a malha de controle
  rápida (MOVE_RAW a 10–20 Hz quando a pose vier de câmera). **Não** passa pelo
  broker.

A distinção não é improviso: é o mesmo par *twin channel* / *live channel* do
Eclipse Ditto, e serve de fundamentação teórica no texto do TCC — mesmo sem
usar o Ditto.

---

## 2. O gateway digital

Nome sugerido: `swarm-edge` (ou `gateway-digital`). Processo Node/NestJS
próprio, no mesmo repo (monorepo) ou repo irmão.

Segue deliberadamente o padrão **IoT Agent** da FIWARE (`iotagent-node-lib`
v4.14.0), sem adotar a biblioteca — ela é JavaScript/callbacks, exige MongoDB
como device registry (já temos Postgres) e é AGPL-3.0. **Adotar o padrão e não
a dependência é uma decisão de projeto defensável — e precisa estar escrita
como tal no TCC**, com o trade-off explícito.

### South port — o lado do dispositivo

Onde vive o que já foi construído e validado byte a byte:

```
serial (1 Mbaud) → HdlcHandler → EdgeEvent → MariProtocol.parseMariFrame
                 → DotBot packet [payloadType][body] → PayloadSelector (decode)
```

Todo esse código **já existe** em `Backend/server/src/Protocols/`. Ele muda de
casa, não é reescrito (ver §6, extração para pacote compartilhado).

### North port — o lado do contexto

- `POST /ngsi-ld/v1/entityOperations/upsert` — telemetria em lote.
- Registra-se como **Context Provider** no Orion-LD para os atributos que só o
  dispositivo sabe responder (`registrations`) — é o equivalente NGSI-LD do
  *live channel*.
- Assina `CommandMessage` para receber comando do broker.

### Os cinco handlers (nomes do padrão IoT Agent)

| Handler | O que faz aqui |
| --- | --- |
| `dataUpdate` | telemetria do robô → `StateMessage` no Orion |
| `dataQuery` | leitura sob demanda de atributo *lazy* (pergunta ao robô) |
| **`command`** | `CommandMessage` → `CMD_MOVE_RAW`/`RGB_LED`/waypoints no rádio — **é este handler que fecha o laço e faz o sistema ser digital twin, e não sombra** |
| `provisioning` | `DOTBOT_ADVERTISEMENT (0x06)` → cria a entidade e avisa o backend |
| `removeDevice` | robô `Lost` → marca/remove entidade |

### Responsabilidades que NÃO são dele

Não decide task, não faz orquestração, não guarda histórico de negócio. Ele
traduz e roteia. Toda regra continua no backend — isso mantém o
`OrchestratorService` como está.

---

## 3. O que muda no backend NestJS (menos do que parece)

O projeto já tomou uma decisão que agora paga dividendo: **o frame de 18 B é um
formato interno** e o `SwarmService` consome `GatewayAdapter`, não a serial.
Então a migração cabe num adapter novo:

```
GATEWAY_MODE = mari | mqtt | simulator | ngsi     <- novo modo
```

`NgsiGatewayAdapter implements GatewayAdapter`:

- `send(destination, payloadType, body)` → em vez de escrever na serial, cria
  um `CommandMessage` no Orion-LD endereçado ao robô (canal twin) **ou**
  empurra o pacote binário pelo canal live, conforme a criticidade do comando
  (tabela em §4).
- `onFrameReceived(cb)` → alimentado por `POST /ngsi/notifications`, que
  converte `StateMessage` de volta para o frame interno de 18 B.

Consequência: `SwarmService`, `OrchestratorService`, `RobotWebsockets`,
`Task`, `Position` — **nenhum muda**. É o mesmo truque que o
`MariGatewayAdapter` já usa com `toInternalFrame()`.

Peças novas no backend:

```
src/adapter/Ngsi/NgsiGateway.Adapter.ts     o adapter (modo ngsi)
src/Ngsi/Ngsi.Controller.ts                 POST /ngsi/notifications (callback)
src/Ngsi/NgsiLd.Service.ts                  upsert em lote, subscriptions, CP
src/Ngsi/NgsiLd.Mapper.ts                   RobotState <-> StateMessage
src/config/ngsi.config.ts                   NGSI_URL, NGSI_TENANT, NGSI_CONTEXT_URL
```

---

## 4. Qual comando vai por qual canal

| Comando | Canal | Por quê |
| --- | --- | --- |
| `CMD_MOVE_RAW` em malha fechada (10–20 Hz) | **live** | broker HTTP no laço de controle = latência variável em cima da estabilidade |
| `CMD_MOVE_RAW` avulso (joystick manual) | live | mesma razão, e o operador sente qualquer atraso |
| `LH2_WAYPOINTS` / lista de destino | **twin** | é ordem de missão, tolera 100–300 ms |
| `CONTROL_MODE` | twin | muda raramente |
| `CMD_RGB_LED` | twin | sem criticidade temporal |
| Parada de emergência | **live** (e espelhada no twin) | `StopCommandMessage` registra o evento, mas a parada não espera o broker |
| Telemetria de estado | twin (1–2 Hz, em lote) | é o que o twin existe para guardar |
| Telemetria bruta por frame (~500 ms) | live → agregada | não publicar cada frame no broker |

Regra geral: **o broker guarda intenção e estado; o canal live carrega urgência.**

---

## 5. O digital twin bidirecional

### Fechando o laço (o critério de Kritzinger)

- **Físico → digital, automático**: advertisement/telemetria → gateway digital →
  `StateMessage` no Orion-LD. (Isto sozinho seria só *sombra digital*.)
- **Digital → físico, automático**: um `CommandMessage` criado no Orion — por
  qualquer cliente, inclusive o simulador ou um dashboard externo — vira comando
  de rádio pelo `command handler`, sem humano no meio. **É isto que promove o
  sistema de sombra para twin**, e é a frase que a banca vai procurar.

### O simulador como réplica preditiva

O `RobotSwarmSimulator` deixa de ser só "modo sem hardware" e passa a rodar
**em paralelo** ao robô real:

1. recebe o mesmo comando que foi para o rádio;
2. avança o modelo cinemático e produz a **pose predita**;
3. o `TwinService` compara com a **pose medida** (câmera/ArUco ou odometria);
4. a divergência vira métrica, alarme e gatilho de re-sincronização.

Isso resolve, de quebra, um problema que já estava no radar em
`hardware_localizacao.md`: sem Lighthouse, a odometria deriva. O twin dá um
detector de deriva quantitativo em vez de "olhar e ver que saiu do lugar".

```
comando ──┬──> robô real ──> pose medida  ──┐
          │                                 ├──> divergência ──> re-sync / alarme / métrica
          └──> simulador ──> pose predita ──┘
```

### Métrica de validação (é aqui que o TCC vira trabalho experimental)

Método replicável de Bergs et al. (2025), *Discover Robotics* 1:10,
DOI 10.1007/s44430-025-00010-4: N ensaios **pareados** (mesmo cenário no
simulador e no real), medindo:

- **distância de Hausdorff entre as trajetórias** — métrica primária, barata de
  computar em TypeScript; baseline publicado **0,195 m** (faixa 0,135–0,25 m);
- erro de posição no alvo (média/máximo);
- RMSE de localização;
- incerteza de navegação (IC 95%; baseline publicado ±0,229 m — bom ponto de
  partida para o limiar de re-sincronização).

Cenários sugeridos, espelhando o paper: espaço livre, obstáculo conhecido,
obstáculo desconhecido, passagem estreita.

### Sincronização

Latência de rádio + broker significa que o twin sempre está um pouco atrás.
Precedente citável: Russo et al. (2025), *SN Computer Science* 6:975,
DOI 10.1007/s42979-025-04525-w, que trata sincronização twin↔físico como
problema de **netcode** — predição no cliente + reconciliação no servidor. O
mesmo padrão cabe no simulador em TypeScript.

O mesmo paper descreve a topologia **multi-agente centralizada** (coordenador
mantém o ambiente virtual e distribui visão filtrada por raio a cada robô), que
é isomorfa a esta arquitetura (gateway digital + Orion-LD como coordenador). É
o paper de enxame mais próximo do nosso caso — se citar um só, é este.

---

## 6. Código compartilhado (a parte chata que precisa ser decidida cedo)

Backend e gateway digital precisam do **mesmo** codec. Duplicar é como o
projeto quebra em três meses.

```
packages/
  swarm-protocol/         <- extraído de Backend/server/src/Protocols/
    Protocol.ts, Protocol.Codec.ts, Wrappers/, PayloadSelector.ts
    Mari/ (Hdlc/, Mari.Protocol.ts)
    Enums/ (PayloadType, NextProto, EdgeEvent, Hdlc...)
apps/
  backend/                <- NestJS atual
  gateway-digital/        <- novo
```

npm workspaces resolve isso sem ferramenta extra. **Os testes byte-a-byte
contra o `marilib` vão junto** — eles são o ativo mais valioso do repo e
precisam continuar rodando depois da mudança de casa.

---

## 7. Fonte da verdade (decidir antes de escrever código)

Com o Orion no meio, o mesmo estado passa a existir em quatro lugares: `Map` do
`SwarmService`, Postgres, Orion-LD e Mintaka. Sem regra explícita isso vira
inconsistência silenciosa.

Regra proposta:

| Dado | Dono | Os outros são |
| --- | --- | --- |
| Estado quente (pose, bateria, último contato) | `SwarmService` (memória) | Orion = publicação; Postgres = amostragem |
| Contexto interoperável corrente | **Orion-LD** | quem for ler de fora lê daqui |
| Histórico de negócio (task, atribuição, usuário) | **Postgres** | — |
| Histórico de trajetória padronizado | **Mintaka/TimescaleDB** | Postgres mantém o próprio, para comparação |
| Identidade física do robô (`address`) | **Postgres** | Orion usa `urn:ngsi-ld:StateMessage:dotbot-<address>` |

O `robots.address` continua sendo a chave física em todo o sistema. O URN é
derivado dele, nunca o contrário.

---

## 8. Infra

`Backend/docker-compose.yml` ganha:

```
orion-ld    :1026     broker NGSI-LD
mongo-db    :27017    estado do Orion-LD
mintaka     :8080     Temporal API (histórico)
timescale   :5433     (NÃO 5432 — já é do nosso Postgres)
context     :3004     serve o @context JSON-LD do projeto
```

Ordem de subida: Postgres → Orion-LD (+Mongo) → gateway digital (abre a serial)
→ backend (`GATEWAY_MODE=ngsi`) → simulador/twin → frontend.

Cuidado operacional: **só um processo pode abrir `/dev/ttyACM0`**. Depois desta
mudança o backend nunca mais abre a serial em produção; se abrir, o gateway
digital para de receber. O modo `mari` continua existindo só para depuração
isolada, com o gateway digital desligado.

---

## 9. Plano de migração em fases (cada fase entrega algo testável)

**Fase 0 — extrair o protocolo** (1–2 dias)
Mover `Protocols/` para `packages/swarm-protocol`, backend passa a importar do
pacote, testes contra o `marilib` continuam verdes. Nada de comportamento muda.

**Fase 1 — gateway digital só de leitura** (2–3 dias)
Ele abre a serial, decodifica e **loga**. Backend segue em `GATEWAY_MODE=mari`
desligado ou em `mqtt`. Valida o south port isolado.

**Fase 2 — Orion-LD + telemetria** (2–3 dias)
Gateway digital publica `StateMessage` em lote. Verificação: `GET
/ngsi-ld/v1/entities?type=StateMessage` mostra o robô. Ainda é sombra digital.

**Fase 3 — `NgsiGatewayAdapter` no backend** (2–3 dias)
`GATEWAY_MODE=ngsi`; o backend volta a ver a frota, agora via notificação.
`SwarmService` e `Orchestrator` não mudam. Ponto de não-retorno da fronteira.

**Fase 4 — laço de retorno** (3–5 dias)
`command handler`: `CommandMessage` no Orion → rádio. **Aqui o sistema vira
digital twin.** Testar com `RGB_LED` primeiro (feedback visual, robô não sai
correndo), depois waypoints.

**Fase 5 — canal live** (2–3 dias)
WebSocket/MQTT binário backend↔gateway digital para MOVE_RAW em malha fechada,
com watchdog de ~500 ms (já previsto em `hardware_localizacao.md`).

**Fase 6 — twin preditivo e métricas** (1–2 semanas)
Simulador em paralelo, `TwinService`, divergência por Hausdorff, ensaios
pareados, gráficos. É o capítulo de resultados.

**Fase 7 — histórico padronizado** (2–3 dias)
Mintaka + TimescaleDB; comparar com o histórico do Postgres.

Total realista: **4 a 7 semanas** de trabalho efetivo, com valor demonstrável a
cada fase.

---

## 10. Riscos honestos

| Risco | Mitigação |
| --- | --- |
| Mais uma casa entre o robô e o log — depurar fica pior | manter `GATEWAY_MODE=mari` como modo de depuração direta; log estruturado com correlação por `address` + timestamp nas duas pontas |
| Latência do broker na malha de controle | canal live; nunca MOVE_RAW pelo Orion |
| Estado duplicado em 4 lugares | tabela de fonte da verdade (§7), escrita antes do código |
| `dataModel.AutonomousMobileRobot` está em v0.0.1 | declarar a maturidade no texto; `@context` próprio para o que faltar (`controlMode`, `swarmId`, `waypointIdx`) |
| Twin bidirecional é escopo grande para TCC | as fases 0–4 já entregam o twin; 5–7 são incrementos separáveis |
| Dois processos = duas chances de subir errado | script único de subida + healthcheck do gateway digital exposto ao backend |
| Ninguém consumir o Orion → camada decorativa | o próprio backend passa a consumir (fase 3): o broker fica no caminho crítico, não ao lado dele |

---

## 11. Fundamentação para o texto

- **Kritzinger et al. (2018)**, *IFAC-PapersOnLine* 51(11):1016–1022,
  DOI 10.1016/j.ifacol.2018.08.474 — model / shadow / twin pelo grau de
  automação do fluxo de dados. Critério central do trabalho.
- **ISO 23247** (framework de digital twin para manufatura) — mapeia quase 1:1
  nesta arquitetura: DotBot = elemento observável; gateway físico + digital =
  coleta e controle; Orion-LD = camada de digital twin; backend/front = usuário.
  Norma paga; citar pela análise aberta do NIST.
- **FIWARE for Digital Twins**, position paper v1.0 (2021) — declara que **não
  existe componente "digital twin"** na FIWARE: a padronização vem do NGSI-LD +
  Smart Data Models, e o Context Broker é a base. Justifica a arquitetura.
- **Eclipse Ditto**, twin channel vs. live channel — vocabulário conceitual dos
  dois canais desta arquitetura (sem implementar o Ditto).
- **VDA 5050 v3.0.0** (mar/2026, VDA + VDMA) — padrão de interface AGV↔fleet
  manager sobre MQTT. Não implementar (pesado demais para o rádio), mas citar:
  é a evidência industrial de que padronizar a interface robô↔controle é
  prática consolidada. Os tipos `CommandMessage`/`StateMessage`/
  `StopCommandMessage` do Smart Data Model ecoam essa estrutura — investigar a
  linhagem seria contribuição original (não verificado).
- **Bergs et al. (2025)** — método experimental e baselines numéricos.
- **Russo et al. (2025)** — DT distribuído multi-agente, topologia centralizada,
  sincronização como netcode.
- **Eclipse Zenoh** — trabalho futuro para o transporte do enxame (5 bytes de
  overhead, ~300 B de footprint em MCU).

---

## 12. Próxima decisão

Antes da Fase 0, definir: monorepo (npm workspaces neste repo) ou repo separado
para o gateway digital. Recomendação: **monorepo** — o codec é compartilhado, os
testes contra o `marilib` são um ativo só, e a banca vê o sistema inteiro num
lugar.

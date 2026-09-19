# FIWARE no TCC_Swarm_Robots — análise de implementação

Pesquisa feita em 2026-09-01 (catálogo FIWARE, ETSI CIM, Smart Data Models,
tutoriais oficiais). Pergunta: como o FIWARE poderia ser incorporado ao que já
existe — NestJS + Postgres, protocolo DotBot, `MariGatewayAdapter` (serial/HDLC)
e `MqttGatewayAdapter` (RobotSwarmSimulator).

> Nota: `FIRMWARE_ANALISE.md`, na mesma pasta, é outro assunto (o embarcado do
> robô/gateway). Este documento é sobre a plataforma FIWARE.

## 0. Veredito curto

FIWARE **não substitui nada do que já foi construído**. Ele não fala rádio, não
faz enquadramento HDLC, não decide atribuição de task. O que ele entrega é uma
camada acima: um **Context Broker** (Orion-LD) falando **NGSI-LD**, um
**vocabulário padronizado** para robô móvel autônomo, e histórico temporal
consultável.

O encaixe é bom por um motivo específico e verificável: existe o Smart Data Model
**`dataModel.AutonomousMobileRobot`**, com entidades `StateMessage`,
`CommandMessage`, `CommandReturnMessage` e `StopCommandMessage` — exatamente o
par telemetria/comando que o nosso `SwarmService` já produz e consome. Não é um
encaixe forçado.

O risco real é fazer FIWARE virar **camada decorativa**: um espelho do Postgres
que ninguém lê. A análise abaixo tenta separar o que dá valor de verdade do que
só adiciona container.

## 1. O que cada peça do FIWARE faria aqui

| Componente | Papel no nosso caso | Entra no escopo? |
| --- | --- | --- |
| **Orion-LD** (context broker NGSI-LD, C/C++, leve) | guarda o estado corrente da frota como entidades NGSI-LD; notifica assinantes | **sim, é o núcleo** |
| MongoDB | estado do Orion-LD | sim (dependência) |
| **Mintaka + TimescaleDB** | Temporal API do NGSI-LD (histórico de trajetória/bateria) | sim, se quisermos histórico padronizado |
| IoT Agent JSON (MQTT) | traduz MQTT → NGSI-LD; aceita `payloadType: "ngsild"` | opcional (ver cenário 3) |
| QuantumLeap | histórico, mas nasceu NGSIv2; NGSI-LD é experimental | **não** — usar Mintaka |
| Cygnus / Draco / Kafnus / Cosmos | persistência/streaming pesado | não |
| Keyrock + Wilma + AuthZForce | IdM OAuth2 + PEP proxy | não — já temos JWT no Nest |
| Perseo (CEP) | regras de evento, mas NGSIv2-cêntrico | não — o `OrchestratorListener` já faz isso |
| FIROS (ROS ↔ FIWARE) | **arquivado em jan/2024**, sem sucessor | não — e nem usamos ROS |

Especificação de referência: **ETSI GS CIM 009 V1.9.1 (jul/2025)**.

## 2. O achado: `dataModel.AutonomousMobileRobot`

Dentro de `smart-data-models/SmartRobotics`. `StateMessage` tem (todas
obrigatórias): `commandTime`, `mode` (`navi` | `standby` | `error`), `errors[]`,
`pose` (`point2D`/`point3D`, `orientation2D`, `mapId`, `geographicPoint`),
`destination` (mesma forma), `accuracy` (covariância), `battery` (ao menos um de
`voltage`, `remainingTime`, `remainingPercentage`).

Mapeamento com o que já temos:

| Nosso modelo | NGSI-LD (`StateMessage`) | Observação |
| --- | --- | --- |
| `robots.address` (hex do rádio) | `id` = `urn:ngsi-ld:StateMessage:dotbot-<address>` | o address continua sendo a chave física |
| `robots.status` (Active/Inactive/Lost) | não tem equivalente direto | `mode` só tem navi/standby/error → mapear Lost→`error`, ou criar propriedade própria no nosso `@context` |
| `robots.mode` (Manual/Auto/SemiAuto) | propriedade própria (`controlMode`) | é conceito nosso, não do modelo |
| `robots.battery` (V) | `battery.voltage` | o modelo aceita volts direto; some a conversão mV→V no meio |
| `positions.x/y` (mm) | `pose.point2D {x, y}` | + `pose.mapId` para separar arena real de cenário do simulador |
| destino do waypoint atual | `destination.point2D` | fecha a leitura "para onde vai" sem inventar campo |
| `positions.source` (LH2/GPS/VISION) | `pose.geographicPoint` ou propriedade própria | GPS cabe no `geographicPoint`; LH2/visão ficam em `point2D` |
| `tasks` | **não existe modelo** | `CommandMessage` cobre comando pontual, não uma task com fila e prioridade — a Task continua sendo nossa |

Ressalva honesta para a banca: o modelo está em **v0.0.1**, de contribuição
japonesa, com adoção estreita. É citável como padrão aberto, não como padrão
consolidado tipo `Device` ou `Vehicle`.

## 3. Três cenários de adoção

### Cenário 1 — Broker como espelho de contexto (RECOMENDADO)

O backend continua dono de tudo. O `SwarmService` ganha um assinante a mais que
publica o estado no Orion-LD.

```
Gateway Mari ──HDLC──┐
                     ├── NestJS (SwarmService + Orchestrator) ──> Postgres (histórico próprio)
Simulador ──MQTT─────┘            │                             └─> WebSocket (front)
                                  │ upsert NGSI-LD (1–2 Hz, em lote)
                                  v
                             Orion-LD ──> Mintaka + TimescaleDB (histórico padronizado)
                                  │
                                  └──> qualquer consumidor externo (dashboard, outro TCC, Grafana)
```

- Ponto de entrada: um `NgsiLdService` chamado de dentro do `refreshAndPersist()`
  que já roda a 1 Hz — **o throttle já existe**, é só reusar.
- Usa `POST /ngsi-ld/v1/entityOperations/upsert` em lote (uma chamada para a
  frota inteira, não uma por robô).
- Risco: baixíssimo. Se o Orion cair, nada do controle para.
- Ganho: interoperabilidade real e um argumento forte de padronização no TCC.
- Esforço: ~2–3 dias (service + docker-compose + `@context` + testes).

### Cenário 2 — Broker no caminho de comando

Comandos entram como `CommandMessage` no Orion-LD; uma subscription notifica o
Nest em `POST /ngsi/notifications`; o Nest traduz para `CMD_MOVE_RAW`/waypoints.

- Aderência total ao padrão (é assim que o OPIL/L4MS faz).
- **Mas**: MOVE_RAW com pose vinda de fora roda a 10–20 Hz (ver
  `hardware_localizacao.md`). Colocar um broker HTTP no meio dessa malha adiciona
  latência variável e um ponto de falha em cima do laço de controle. Má ideia.
- Recomendação: se adotar, **só para comandos de alto nível** — atribuir task,
  mandar lista de waypoints, mudar control mode, parada de emergência
  (`StopCommandMessage`). Malha rápida nunca passa pelo broker.

### Cenário 3 — IoT Agent JSON no caminho do simulador

O RobotSwarmSimulator publicaria MQTT direto no IoT Agent JSON (que aceita
`payloadType: "ngsild"`), e o Orion viraria a fonte da telemetria simulada.

- Vantagem: é o desenho "de manual" do FIWARE.
- Desvantagem concreta pro nosso caso: quebra a simetria que o projeto construiu
  de propósito — hoje Mari e MQTT entram pela **mesma** interface `GatewayAdapter`
  e o `SwarmService` não sabe a diferença. Com IoT Agent, o simulador passaria por
  um caminho estruturalmente diferente do hardware. Perde-se a comparação
  simulador↔real que é o ponto do TCC.
- Veredito: não vale, a não ser que o objetivo seja demonstrar o IoT Agent.

## 4. Infra (o que sobe a mais)

Adicionar ao `Backend/docker-compose.yml` (o Postgres já está lá):

```
orion-ld    :1026    broker NGSI-LD
mongo-db    :27017   estado do Orion-LD
mintaka     :8080    Temporal API (histórico NGSI-LD)
timescale   :5432→   TimescaleDB do Mintaka (mudar porta, o 5432 já é do nosso Postgres)
context     :3004    servidor estático do nosso @context JSON-LD
```

Opcional (só no cenário 3): `iot-agent :4041` + Mosquitto (o simulador já traz um
`mosquitto` no docker-compose dele).

Consumo: Orion-LD é C/C++ e leve; o peso está em MongoDB + TimescaleDB. Medir com
`docker stats` antes de afirmar número no texto do TCC.

## 5. Código no NestJS

Não existe SDK TypeScript oficial mantido pela FIWARE Foundation. O `ngsijs`
(Ficodes) está listado como *incubated* e a versão npm mais recente é
release-candidate. **Recomendação: escrever um `NgsiLdService` sobre `axios`**,
com tipos derivados do schema do Smart Data Model — é REST + JSON puro, dá menos
dependência frágil e mostra domínio da especificação (o que numa banca conta).

Peças novas, todas pequenas:

```
src/Ngsi/
  NgsiLd.Service.ts        upsert em lote, subscription, healthcheck
  NgsiLd.Mapper.ts         RobotState (nosso) -> StateMessage (NGSI-LD)
  Ngsi.Controller.ts       POST /ngsi/notifications (callback de subscription)
  ngsi.config.ts           NGSI_URL, NGSI_TENANT, NGSI_CONTEXT_URL, NGSI_ENABLED
src/context/
  swarm-context.jsonld     nosso @context (controlMode, swarmId, waypointIdx...)
```

Detalhes que evitam retrabalho:
- `NGSI_ENABLED=false` por default — o FIWARE tem que ser **desligável**, igual ao
  `GATEWAY_MODE`. Nada do controle pode depender dele.
- multi-tenancy por header `NGSILD-Tenant`: `simulador` vs `arena` separa os dois
  mundos sem duplicar entidade.
- `throttling` na subscription, senão N robôs geram N×f POSTs/s no próprio backend.
- id canônico: `urn:ngsi-ld:StateMessage:dotbot-<address>`.

## 6. Custo x benefício

| | Cenário 1 (espelho) | Cenário 2 (comando) | Cenário 3 (IoT Agent) |
| --- | --- | --- | --- |
| Esforço | ~2–3 dias | +3–5 dias | +2–4 dias |
| Risco pro que já funciona | baixo | **alto** (latência na malha) | médio (quebra a simetria) |
| Valor acadêmico | alto (padrão aberto) | alto | médio |
| Valor funcional real | médio | baixo | baixo |

**Recomendação: Cenário 1 agora; Cenário 2 apenas para comandos de alto nível, e
só depois do hardware/simulador estarem validados.** Cenário 3, fora.

## 7. Justificativa acadêmica (para o texto do TCC)

- Precedente direto: **OPIL / L4MS** (H2020, Fraunhofer IML) — plataforma de
  logística com Orion Context Broker como hub central, agentes de robô, e um
  simulador cujos agentes virtuais se comportam como os físicos. É o mesmo
  paradigma deste TCC (simulador MQTT + robô real no mesmo pipeline).
- Padrão: **ETSI GS CIM 009 V1.9.1** (NGSI-LD) — dá ao trabalho uma fundamentação
  normativa que "REST próprio + WebSocket" não tem.
- Lacuna a explorar: literatura recente de gestão de frotas heterogêneas ainda usa
  protocolos proprietários e trata padronização semântica como trabalho futuro —
  espaço legítimo para posicionar a contribuição.
- Ponto a declarar com franqueza: o bridge ROS oficial (**FIROS**) está arquivado
  desde jan/2024. Não nos afeta (não usamos ROS), mas precisa ser dito para
  explicar por que a integração é feita por cliente NGSI-LD próprio.

## 8. Próximos passos sugeridos

1. Decidir o objetivo: interoperabilidade/padrão para a banca (→ Cenário 1) ou
   funcionalidade nova de verdade (→ nesse caso FIWARE não é a prioridade; o
   roadmap atual — MQTT adapter, gateway físico, frontend — entrega mais).
2. Subir `orion-ld` + `mongo-db` isolados e criar uma `StateMessage` na mão com
   `curl`, para sentir o NGSI-LD antes de escrever código.
3. Escrever o `@context` do projeto e publicar no `context-server`.
4. `NgsiLdService` com upsert em lote chamado pelo ciclo de 1 Hz já existente.
5. Só então Mintaka + TimescaleDB, e comparar com o histórico que o Postgres já
   guarda (bom material de resultado: mesma trajetória, duas representações).

## Fontes

- https://fiware.org/ — catálogo, tutoriais, Smart Data Models
- https://github.com/FIWARE/catalogue/tree/master/core — componentes Active
- https://github.com/FIWARE/context.Orion-LD — broker NGSI-LD
- https://github.com/FIWARE/mintaka — Temporal API (TimescaleDB)
- https://www.etsi.org/deliver/etsi_gs/CIM/001_099/009/01.09.01_60/gs_CIM009v010901p.pdf — ETSI GS CIM 009 V1.9.1
- https://github.com/smart-data-models/SmartRobotics — domínio de robótica
- https://github.com/smart-data-models/dataModel.AutonomousMobileRobot — StateMessage/CommandMessage
- https://github.com/FIWARE/tutorials.NGSI-LD — docker-compose de referência
- https://github.com/telefonicaid/iotagent-json — MQTT → NGSI-LD (`payloadType: ngsild`)
- https://github.com/iml130/firos — FIROS (arquivado em 2024)
- https://opil-documentation.readthedocs.io/en/latest/OPIL_Intro/OPIL_Architecture.html — arquitetura OPIL/L4MS

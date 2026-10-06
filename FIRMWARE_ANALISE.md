# Firmware — análise de implementação no TCC_Swarm_Robots

Pesquisa feita em 2026-09-01 direto nos repos da org DotBots (links no fim).
Objetivo: responder "o que precisa rodar dentro do robô e do gateway pra
ligar o backend NestJS que já está pronto no hardware real".

## 0. Resumo executivo

**Não é preciso escrever firmware.** Existe firmware pré-compilado publicado
nos GitHub Releases que fecha exatamente o contrato que o nosso
`MariGatewayAdapter` já implementa. O trabalho de firmware é de
**provisionamento** (gravar 4~5 imagens com `nrfjprog`), não de programação em C.

Escrever C só entra num cenário: se quisermos **odometria a bordo** (encoders
via `drv/move`) por não termos Lighthouse — e mesmo esse caso tem um desvio
mais barato (MOVE_RAW + pose por câmera/ArUco no backend), que roda com o
firmware pronto sem alterar uma linha.

## 1. Onde o firmware entra na nossa arquitetura

```
Frontend ── REST/WS ── NestJS (PRONTO) ── HDLC/serial ── [GATEWAY nRF5340] ~~ rádio Mari ~~ [ROBÔ DotBot]
                       Protocol.ts                        app core: UART+HDLC+IPC       net core: Mari node
                       Mari.Protocol.ts                   net core: Mari gateway        app core: bootloader + app
                       MariGateway.Adapter.ts                                                     (sandbox)
```

A parte de rádio (TSCH sobre BLE 2 Mbps) mora **inteira** no firmware, nos dois
lados. O backend só fala bytes enquadrados por HDLC na serial — que é o que já
está construído e validado byte a byte contra o `marilib`.

### Divisão por core (nRF5340 é dual-core)

No nRF5340 o periférico RADIO fica no **net core**; o app core não toca rádio
(confirmado em `dotbot-libs/bsp/nrf/radio_nrf5340_app.c`).

| Peça | Net core | App core |
| --- | --- | --- |
| Gateway (nRF5340DK) | `03app_gateway_net` (mari, `MARI_GATEWAY`, schedule_huge) | `03app_gateway_app` (UART 1 Mbaud + HDLC + IPC) |
| Robô (DotBot v2/v3) | netcore do swarmit (`mari_init(MARI_NODE, ...)`) | bootloader TrustZone (secure) + app do usuário (non-secure, `apps-sandbox/dotbot`) |

## 2. Contrato firmware ↔ backend (conferido, bate)

- Header Mari real = **21 bytes** `{version(1), type(1), network_id(2 LE),
  dst(8 LE), src(8 LE), next_proto(1)}` — `mari/firmware/mari/models.h`.
  Nosso `MariProtocol.buildMariHeader` grava exatamente esses offsets. ✅
- `next_proto` do nosso tráfego = `MARI_NEXT_PROTO_DOTBOT_APP = 0x11`. ✅
  (`NextProto.DOTBOT_APP` já é 0x11.)
- Payload de aplicação = **`[payload_type(1)][body]`**, sem header extra
  (o firmware sandbox lê `*cmd_ptr++` como payload type; o PyDotBot monta igual).
  É exatamente o que o `MariGatewayAdapter.send` faz. ✅
- Prefixo EdgeEvent (1 byte) + HDLC no fio. ✅
- Serial do gateway: **1000000 baud** (`MR_UART_BAUDRATE`) — já é o nosso default. ✅

**Único ajuste obrigatório: o `network_id`.** No firmware ele é gravado numa
página de config no flash do **net core**, em `0x0103F800`, struct
`{magic=0x5753524D ("SWRM"), has_net_id, net_id}`. Sem config válida, o firmware
cai em `MARI_NET_ID_DEFAULT = 1`. Nosso `.env` está com `MARI_NETWORK_ID=0x0001`,
que por coincidência bate com o default — mas se o gateway for provisionado com
`--network-id 0100`, o `.env` tem que virar `0x0100`. Robô e gateway precisam do
**mesmo** id, senão o nó nunca entra na rede (sintoma: nada chega, sem erro).

**Detalhe que evita confusão futura:** a posição do robô sai em dois
`next_proto` diferentes — advertisement DotBot em `0x11` (~500 ms, o nosso) e
STATUS do swarmit em `0x10` (~1 s, do cliente swarmit). Nosso adapter já descarta
tudo que não é `0x11`, então está correto — mas ao esnifar a serial vão aparecer
pacotes "estranhos" que não são erro.

## 3. Caminhos possíveis

### Caminho A — firmware pré-compilado (RECOMENDADO)

Zero linha de C. Baixa os `.hex`/`.bin` dos Releases e grava.

Imagens necessárias:

| Alvo | Imagem | Origem |
| --- | --- | --- |
| Gateway app core | `03app_gateway_app-nrf5340-app.hex` | release do `swarmit` (0.8.0) |
| Gateway net core | `03app_gateway_net-nrf5340-net.hex` | release do `swarmit` |
| Robô app core (secure) | `bootloader-dotbot-v2.hex` / `-v3.hex` | release do `swarmit` |
| Robô net core | `netcore-nrf5340-net.hex` | release do `swarmit` |
| Robô app core (non-secure) | `dotbot-sandbox-dotbot-v2.bin` / `-v3.bin` | release do `DotBot-firmware` (1.22.0) |

Ferramenta: `pip install dotbot-provision` faz fetch + flash + grava o
network_id numa tacada:

```
dotbot-provision fetch --fw-version 0.8.0
dotbot-provision flash --device gateway   --fw-version 0.8.0 --network-id 0100
dotbot-provision flash --device dotbot-v3 --fw-version 0.8.0 --network-id 0100 -a motors
```

**Pegadinhas achadas na pesquisa:**
- O README do `dotbot-provision` manda usar `--fw-version v0.7.0`, mas as tags do
  swarmit **não têm o `v`** (`0.7.0`, `0.8.0`). Com `v0.7.0` o download dá 404.
- `dotbot-provision` só aceita `--device dotbot-v3` ou `gateway`
  (`VALID_DEVICES` no `cli.py`). **Se o nosso robô for v2**, o firmware existe
  (`dotbot-dotbot-v2.hex`, `bootloader-dotbot-v2.hex`,
  `dotbot-sandbox-dotbot-v2.bin`), mas o flash é manual com `nrfjprog`
  (`-f NRF53 --coprocessor CP_APPLICATION|CP_NETWORK --program ... --verify --chiperase --reset`)
  e a página de config do net_id tem que ser escrita à mão em `0x0103F800`.
- Precisa de `nrfjprog` (nRF Command Line Tools) e, para o robô, do programador
  embutido (pyocd/DAPLink ou J-Link). Robô novo de fábrica pede `flash-bringup` antes.

Custo: R$ 0 se já temos o robô, o gateway e um probe. Risco: baixo. Tempo: uma tarde.

### Caminho B — bare-metal legado (sem Mari, sem TrustZone)

`apps/dotbot` (app core) + `apps/nrf5340_net` (net core) no robô, e
`apps/dotbot_gateway` num nRF52840DK/nRF5340DK como gateway. Rádio BLE 1 Mbit cru,
access address `0xDB12DB12`, sem TSCH.

O ponto interessante: **o gateway bare também prefixa `DB_EDGE_EVENT_DATA (3)` +
HDLC**, espelhando o EdgeEvent do Mari, e o header no ar (`db_frame_header_t`) é
cópia byte a byte do `mr_packet_header_t` de 21 B. Ou seja, **nosso
`MariGatewayAdapter` funciona sem alteração** — só o `network_id` muda
(`DB_FRAME_NETWORK_ID = 0xD0B0`).

Quando usar: se o provisionamento do swarmit (TrustZone + OTA) travar, ou se o
gateway disponível não for nRF5340. Desvantagem: é o caminho antigo, sem
channel-hopping, e não escala pra enxame denso — mas pro TCC com 1 robô, entrega
o mesmo resultado com menos peças móveis.

### Caminho C — firmware próprio em C

Só compensa se a decisão de localização exigir. Toolchain real:

- SEGGER Embedded Studio for ARM (o CI usa v712a; docs mencionam 8.22a), com os
  pacotes CMSIS-CORE_V5, CMSIS-DSP_V5 e nRF instalados pelo package manager.
- Build por linha de comando: `SEGGER_DIR=/opt/segger BUILD_TARGET=dotbot-v2 BUILD_CONFIG=Release make`
  (alvos: `make list-targets`, `make artifacts`).
- Ou Docker `aabadie/dotbot:latest` (`make docker`) — **atenção: imagem
  linux/amd64; em Mac Apple Silicon roda sob QEMU e é desaconselhado pelo próprio
  repo**. Como o ambiente aqui é MacBook Air, o caminho realista é SES nativo
  (ou uma VM/PC x86).
- Clonar com `--recurse-submodules` (o `dotbot-libs` é submódulo).

O que já vem pronto e não precisa ser escrito: `drv/move`
(`db_move_straight`, `db_move_rotate`, odometria por encoder), `drv/pid`,
drivers de IMU/magnetômetro, `drv/protocol.h` com todos os payload types.
Um app custom seria basicamente "colar" esses drivers no callback de RX.

## 4. Cruzamento com a decisão de localização (sem Lighthouse)

Registrado em `hardware_localizacao.md`: não temos base stations, então o robô
**não** produz posição LH2. Consequências para o firmware:

- `LH2_WAYPOINTS (0x08)` fica inútil no caminho A: o seguimento de waypoint a
  bordo fecha a malha com a pose LH2 medida pelo próprio robô. Sem LH2, mandar
  waypoint não move nada.
- `CMD_MOVE_RAW (0x00)` **continua funcionando** com o firmware pronto — é
  comando direto de motor, não depende de localização. Este é o achado que
  destrava tudo: com pose vinda de fora (câmera + ArUco no PC), o backend fecha
  a malha e manda MOVE_RAW a 10–20 Hz. **Nenhum firmware custom é necessário.**
- Pendência do backend nesse cenário (não é firmware): watchdog de MOVE_RAW
  (parar por timeout ~500 ms) e cálculo do `waypoint_idx` no backend, já
  antecipados no `hardware_localizacao.md`.
- Alternativa "robô autônomo de verdade" (odometria a bordo com `drv/move` +
  bússola): aí sim é Caminho C. Melhor narrativa de TCC, custo de uma toolchain
  embarcada inteira. Decisão de escopo, não técnica.

## 5. Esforço e risco

| Caminho | Esforço | Risco | Entrega |
| --- | --- | --- | --- |
| A (pré-compilado, v3) | ~1 dia | baixo | frota real falando com o backend |
| A' (pré-compilado, v2 na mão) | ~2 dias | médio (flash manual + config de net_id) | idem |
| B (bare-metal legado) | ~1–2 dias | médio (gateway extra, caminho deprecado) | idem, sem TSCH |
| C (firmware próprio) | ~1–3 semanas | alto (SES, TrustZone, debug embarcado) | autonomia a bordo |

## 6. Próximos passos sugeridos (ordem)

1. **Confirmar o hardware**: o robô é DotBot v2 ou v3? Tem programador
   (DAPLink/J-Link) e cabo? O gateway é um nRF5340DK ou a placa Mari Gateway?
   Isso decide entre A e A' e é a única incógnita bloqueante.
2. Instalar `nrf-command-line-tools` (nrfjprog) e `pip install dotbot-provision`;
   `dotbot-provision fetch --fw-version 0.8.0` (sem o `v`).
3. Flashar o **gateway** primeiro e validar isolado: abrir a serial a 1 Mbaud e
   confirmar que chegam quadros HDLC (nosso `HdlcHandler` já sabe parsear; dá pra
   testar com um script antes de subir o Nest).
4. Flashar o **robô** com o mesmo `--network-id`; conferir se o backend recebe
   `DOTBOT_ADVERTISEMENT (0x06)` e faz o auto-cadastro que já está implementado.
5. Testar `CMD_RGB_LED (0x01)` (feedback visual imediato, sem risco de o robô
   sair correndo), depois `CMD_MOVE_RAW (0x00)` com o robô suspenso.
6. Só então decidir sobre localização (ArUco no backend vs. odometria em C).

## Fontes

- https://github.com/DotBots/mari — pilha Mari, firmware do gateway, `models.h`, baudrate
- https://github.com/DotBots/mari/blob/main/firmware/AGENTS.md — targets de build, roles, flash.sh
- https://github.com/DotBots/DotBot-firmware — apps bare e apps-sandbox, `dotbot-v2.emProject`, Makefile/Docker
- https://github.com/DotBots/DotBot-firmware/blob/main/apps-sandbox/dotbot/main.c — RX callback, payload sem header extra
- https://github.com/DotBots/DotBot-firmware/blob/main/apps/dotbot_gateway/dotbot_gateway.c — gateway bare com EdgeEvent+HDLC
- https://github.com/DotBots/DotBot-libs/blob/main/drv/protocol.h — payload types
- https://github.com/DotBots/DotBot-libs/blob/main/drv/frame.h — header de 21 B, constantes do caminho bare
- https://github.com/DotBots/swarmit — bootloader, netcore, sandbox TrustZone; releases com os .hex
- https://github.com/DotBots/dotbot-provision — fetch/flash/network-id, requisitos de probe
- https://github.com/DotBots/PyDotBot — referência do host (adapter.py, filtro next_proto 0x11)

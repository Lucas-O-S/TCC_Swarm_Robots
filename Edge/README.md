# Edge — borda dos robôs

Processo NestJS independente que é o **único dono do hardware**: abre a serial
do gateway Mari (HDLC), fala com o RobotSwarmSimulator por MQTT, dá o `start`
do swarmit, decodifica os pacotes do DotBot e expõe a frota num contrato
público (REST `/v1` + socket.io). Não tem banco, usuário nem regra de negócio.

A API do front (`Backend/server`) é só um cliente da borda. Qualquer outro
sistema pode usar a borda sozinho, sem a API: por isso ela não importa nada do
`Backend/` (o que as duas precisam em comum está copiado de propósito).

## Como rodar

```bash
cd Edge/server
cp .env.example .env      # ajuste GATEWAY_MODE / MARI_* / MQTT_*
npm install
npm run start:dev         # porta 3001 (EDGE_PORT)
```

- REST: <http://localhost:3001/v1>
- Swagger: <http://localhost:3001/api>
- socket.io: mesma porta (`http://localhost:3001`)

Hardware real: `npm run swarm:up` dá boot na frota antes (ou `MARI_AUTO_START=true`
deixa a borda dar o `start` sozinha).

## Transporte (`GATEWAY_MODE`)

| Valor | O que faz |
| --- | --- |
| `mari` | gateway físico na serial (`MARI_PORT`, `MARI_BAUDRATE`, `MARI_NETWORK_ID`) |
| `mqtt` | RobotSwarmSimulator via broker (`MQTT_URL`, `MARI_NETWORK_ID` = `network.id` do cenário) |
| `simulator` (default) | fake, só loga o hex; `SIMULATOR_FAKE_ADVERTISEMENT=true` cria um robô de teste |

## Contrato público (v1)

Endereço (`address`) = 16 dígitos hex; a borda normaliza para MAIÚSCULAS.

### Comandos — `POST /v1/robots/:address/commands/<comando>` → `202`

| Comando | Corpo |
| --- | --- |
| `move-raw` | `{ "left_x", "left_y", "right_x", "right_y" }` (-128..127; `left_y`/`right_y` = PWM das rodas) |
| `rgb-led` | `{ "red", "green", "blue" }` (0..255) |
| `control-mode` | `{ "mode": 0 \| 1 }` (0 Manual, 1 Auto — só o que o robô entende) |
| `waypoints` | `{ "threshold": mm, "waypoints": [{ "x", "y" }] }` (mm, LH2) |
| `xgo-action` | `{ "action": 0..255 }` |

`202` quer dizer "entregue ao gateway" — o rádio não confirma execução.
Corpo inválido → `400`.

### Leitura

- `GET /v1/robots` → `[{ address, status, state }]`
- `GET /v1/robots/:address` → `{ address, status, state }` (404 se a borda nunca ouviu o robô)

### Eventos (socket.io)

| Evento | Payload |
| --- | --- |
| `robot:states` | `{ states: [{ address, type, payloadType, data, position, updatedAt }, ...] }` — lote a cada ~20 ms, em ordem de chegada |
| `robot:status` | `{ address, status, lastSync }` — `status`: 0 Active, 1 Inactive (>5 s sem frame), 2 Lost (>60 s) |
| `robot:joined` | `{ address }` — primeiro advertisement desde que a borda subiu |

- `type`: nome do payload (`DOTBOT_ADVERTISEMENT`, `GPS_POSITION`, ...).
- `data`: campos decodificados como vieram do robô (`battery` em mV, `pos_x`/`pos_y` em mm, `waypoint_idx`...).
- `position`: `{ source, x, y, direction }` já extraída (`source` 0 = LH2 em mm, 1 = GPS em graus) ou `null` sem leitura.

Ao conectar, um cliente deve chamar `GET /v1/robots` uma vez para pegar o
quadro atual e daí em diante seguir os eventos.

### Calibração LH2 (só `GATEWAY_MODE=mari`)

Fora do modo `mari` o GET responde `supported: false` e as demais rotas, `409`.

- `GET /v1/lh2/calibration` → arquivo carregado e a calibração reportada por robô.
- `POST /v1/lh2/calibration/push` `{ address? }` → `202`; reenvia a calibração carregada (sem `address`, a frota toda).

Captura pela própria borda (substitui o `dotbot swarm lh2-calibration collect`):
base station em qualquer canal, quadrado marcado no chão, robô ligado. A
sessão calibra uma estação: a do `channel` pedido ou, sem ele, a de menor canal
que o robô enxergar na primeira leitura (`GET .../session` mostra em `channel`).
A matriz vai no slot do índice da estação (canal 7 = 7 slots, os 6 primeiros
zerados), que é como o firmware procura a homografia.

| Rota | Corpo | O que faz |
| --- | --- | --- |
| `POST /v1/lh2/calibration/session` | `{ address, distanceMm?, tag?, channel? }` | reserva o robô (STOP se estiver rodando; sem calibração nem START até terminar). `distanceMm` = lado do quadrado, default 500; a arena útil é 5 × o lado |
| `GET /v1/lh2/calibration/session` | - | cantos capturados, `missing`, `pending`, `station`/`channel` calibrados, `otherStations` (índices vistos e ignorados) |
| `POST /v1/lh2/calibration/session/capture` | `{ corner }` | `top-left`, `top-right`, `bottom-left` ou `bottom-right`, com o fotodiodo do robô na marca. Espera a leitura (até ~20 s); `504` se não vier, `409` fora do Bootloader |
| `POST /v1/lh2/calibration/session/solve` | - | calcula a homografia, grava o TOML (formato do PyDotBot 0.30.0, em `LH2_CALIBRATION_DIR`), carrega e marca a frota toda para receber. `400` se faltar canto ou as capturas forem inconsistentes |
| `DELETE /v1/lh2/calibration/session` | - | cancela e solta o robô |

O TOML gerado só continua carregado depois de reiniciar a borda se o caminho
dele for para o `LH2_CALIBRATION_FILE`.

### Autenticação

`EDGE_AUTH_ACTIVATED=false` (default): aberto. Com `true`, todo cliente manda o
`EDGE_TOKEN`: `Authorization: Bearer <token>` no REST e `auth: { token }` no
socket.io. A premissa hoje é **um sistema usando a borda por vez**: não há
usuários, escopos nem arbitragem. Todo comando passa por um ponto só
(`CommandService.send`), que é onde a arbitragem entraria se um dia precisar.

## Estrutura

```
server/src/
  Protocols/        frame, HDLC, Mari, Swarmit, wrappers de payload (encode/decode)
  adapter/          GatewayAdapter: Mari (serial), Mqtt (simulador), Simulator (fake)
  Classes/
    Gateway/        escolhe o adapter por GATEWAY_MODE
    Swarm/          estado vivo, status por silêncio, posição, GET /v1/robots
    Commands/       POST /v1/robots/:address/commands/*  (ponto único de envio)
    Auth/           token único (EDGE_TOKEN)
  Websockets/       socket.io: robot:states / robot:status / robot:joined
  Tests/            HDLC byte a byte contra o marilib (npm test)
```

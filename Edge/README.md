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
| `robot:state` | `{ address, type, payloadType, data, position, updatedAt }` |
| `robot:status` | `{ address, status, lastSync }` — `status`: 0 Active, 1 Inactive (>5 s sem frame), 2 Lost (>60 s) |
| `robot:joined` | `{ address }` — primeiro advertisement desde que a borda subiu |

- `type`: nome do payload (`DOTBOT_ADVERTISEMENT`, `GPS_POSITION`, ...).
- `data`: campos decodificados como vieram do robô (`battery` em mV, `pos_x`/`pos_y` em mm, `waypoint_idx`...).
- `position`: `{ source, x, y, direction }` já extraída (`source` 0 = LH2 em mm, 1 = GPS em graus) ou `null` sem leitura.

Ao conectar, um cliente deve chamar `GET /v1/robots` uma vez para pegar o
quadro atual e daí em diante seguir os eventos.

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
  Websockets/       socket.io: robot:state / robot:status / robot:joined
  Tests/            HDLC byte a byte contra o marilib (npm test)
```

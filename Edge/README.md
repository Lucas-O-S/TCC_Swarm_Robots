# Edge — borda dos robôs

Processo NestJS independente que é o **único dono do hardware**: abre a serial
do gateway Mari (HDLC), fala com o RobotSwarmSimulator por MQTT, dá o `start`
do swarmit, decodifica os pacotes do DotBot e expõe a frota num contrato
público (REST `/v1` + socket.io). Não tem banco, usuário nem regra de negócio.

A API do front (`Backend/server`) é só um cliente da borda: conecta aqui, ou
recebe a conexão da borda pelo uplink (ver "Uplink"). Qualquer outro
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
| `control-mode` | `{ "mode": 0 \| 1 }` (0 Manual, 1 Auto — só o que o robô entende). Para o robô: a borda manda `LH2_WAYPOINTS` vazio e depois o `CONTROL_MODE` |
| `waypoints` | `{ "threshold": mm, "waypoints": [{ "x", "y" }] }` (mm, LH2) |
| `xgo-action` | `{ "action": 0..255 }` |

`202` quer dizer "entregue ao gateway" — o rádio não confirma execução.
Corpo inválido → `400`.

Por que o `control-mode` sai em dois pacotes: no firmware 1.23.0 o `CONTROL_MODE`
só zera os motores uma vez (não troca o modo nem apaga a rota); em Auto o laço
de controle religa no próximo fix da LH2. Só a lista de waypoints vazia tira o
robô do Auto. Nos simuladores a lista vazia também para o robô.

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

- `GET /v1/lh2/calibration` → arquivo carregado, `metadata` (`{ distanceMm, tag, createdAt }` lidos do `[metadata]` do TOML; `null` sem arquivo ou com `calibration.out`) e a calibração reportada por robô.
- `POST /v1/lh2/calibration/push` `{ address? }` → `202`; reenvia a calibração carregada (sem `address`, a frota toda).

No boot, com `LH2_CALIBRATION_FILE` preenchido, a borda carrega esse arquivo e
cada robô que aparecer recebe essa calibração **uma vez nesta execução**, mesmo
já reportando calibrado - o device-info só traz contagem e flags, então dois
robôs com matrizes diferentes na flash pareceriam iguais. Quem já estava
rodando recebe quando passar pelo Bootloader (`forcePending` no GET). Com o
campo vazio nada é carregado nem enviado (a borda não escolhe o arquivo mais
recente sozinha) e os robôs seguem com a calibração que têm na flash.

Captura pela própria borda (substitui o `dotbot swarm lh2-calibration collect`):
base station em qualquer canal, quadrado marcado no chão, robô ligado. A
sessão calibra uma estação: a do `channel` pedido ou, sem ele, a de menor canal
que o robô enxergar na primeira leitura (`GET .../session` mostra em `channel`).
A matriz vai no slot do índice da estação (canal 7 = 7 slots, os 6 primeiros
zerados), que é como o firmware procura a homografia.

| Rota | Corpo | O que faz |
| --- | --- | --- |
| `POST /v1/lh2/calibration/session` | `{ address, distanceMm? \| widthMm? + heightMm?, tag?, channel?, areaWidthMm?, areaHeightMm?, rectXMm?, rectYMm? }` | reserva o robô (STOP se estiver rodando; sem calibração nem START até terminar). As 4 marcas no chão formam um retângulo: `distanceMm` para quadrado (default 500) ou `widthMm` + `heightMm` (nunca os dois jeitos). Com os 4 campos da área (juntos), a calibração sai no referencial da área real (ver abaixo); sem eles, layout do PyDotBot (arena de 5 × o tamanho). A resposta mostra `widthMm`/`heightMm`, `references` (para onde cada canto vai) e `area` |
| `GET /v1/lh2/calibration/session` | - | cantos capturados, `missing`, `pending`, `station`/`channel` calibrados, `otherStations` (índices vistos e ignorados) |
| `POST /v1/lh2/calibration/session/capture` | `{ corner }` | `top-left`, `top-right`, `bottom-left` ou `bottom-right`, com o fotodiodo do robô na marca. Espera a leitura (até ~20 s); `504` se não vier, `409` fora do Bootloader |
| `POST /v1/lh2/calibration/session/solve` | - | calcula a homografia, grava o TOML (formato do PyDotBot 0.30.0, em `LH2_CALIBRATION_DIR`) e, ao lado, `<nome>.corners.json` com as leituras cruas dos 4 cantos (para recalcular sem voltar ao chão enquanto a base não mudar de lugar); carrega e marca a frota toda para receber. Devolve `file`, `cornersFile` e `metadata`. `400` se faltar canto ou as capturas forem inconsistentes |
| `DELETE /v1/lh2/calibration/session` | - | cancela e solta o robô |
| `POST /v1/lh2/calibration/correct` | só o que foi digitado errado: `distanceMm` \| `widthMm` + `heightMm`, os 4 campos da área, `tag` | refaz a calibração **carregada** com a medida certa, sem voltar ao chão (vale enquanto a base não sair do lugar e se os cantos foram capturados nas marcas certas); o resto continua como estava. Grava um TOML novo (`corrected_from` no `[metadata]`), carrega e marca a frota. `409` sem calibração carregada, sem `[metadata]` ou com captura em andamento; `400` sem nada para corrigir, campo faltando ou retângulo fora da área |

**Referencial da área real.** O PyDotBot põe a marca no meio de uma arena de
5 × o tamanho dela: o (0,0) é um ponto virtual a 2 larguras/alturas do canto
top-left (quadrado de 800 → canto em (1600, 1600)). Informando a área, o (0,0)
passa a ficar **1000 mm** (`LH2_AREA_MARGIN_MM`) antes do canto
superior-esquerdo da área, para cima e para a esquerda, e o retângulo onde ele
foi marcado: `rectXMm`/`rectYMm` = distância da borda esquerda/de cima da área
até o canto top-left do retângulo, medida no chão. Ex.: área 1200 × 1200,
quadrado de 800 a 200 mm das bordas → área de (1000, 1000) a (2200, 2200),
quadrado de (1200, 1200) a (2000, 2000). Um retângulo grande, perto do tamanho
da área (recuado das paredes o bastante para o robô chegar nos cantos), erra
menos que um quadrado pequeno longe das marcas. A margem existe porque
coordenada negativa o firmware descarta: robô até 1 m fora da área continua
com posição. É fixa para o canto da área não mudar se a calibração for refeita
com outro retângulo. Vai no `[metadata]` (`calibration_width_mm`/
`calibration_height_mm` no retângulo, `rect_x_mm`, `rect_y_mm`, `area_*_mm` -
o PyDotBot ignora, só lê `data_hex`; o `calibration_distance_mm` leva a
largura) e aparece no `metadata` do GET.

O TOML gerado só continua carregado depois de reiniciar a borda se o caminho
dele for para o `LH2_CALIBRATION_FILE`.

### Uplink (a borda conecta no back)

Para quando o back não alcança a borda (nuvem, NAT, 4G): em vez de o back
conectar aqui, a borda abre uma conexão socket.io de saída até ele. É opcional:
a borda segue servindo o REST e o socket.io dela normalmente, e sobe e funciona
com o back fora do ar.

| Variável | O que faz |
| --- | --- |
| `BACKEND_URL` | URL socket.io do back, com o namespace se houver (ex. `https://api.exemplo.com/edge`). Vazio = uplink desligado |
| `EDGE_ID` | nome desta borda no back; único entre as bordas ligadas no mesmo back. Vazio = hostname da máquina |
| `EDGE_TOKEN` | o mesmo token da borda, mandado no handshake |

Handshake: `auth: { token: EDGE_TOKEN, edgeId: EDGE_ID }`, transporte só
`websocket`. A reconexão é automática (1 s até 10 s entre tentativas). Se o
back recusar o handshake (token), a borda tenta de novo a cada 30 s. Se o back
derrubar a conexão, ela reconecta na hora.

Eventos borda → back:

| Evento | Payload |
| --- | --- |
| `robot:snapshot` | `{ robots: [{ address, status, state }, ...] }` — o mesmo do `GET /v1/robots`, mandado a cada (re)conexão (o back não consegue chamar o REST da borda) |
| `robot:states` / `robot:status` / `robot:joined` | iguais aos da seção "Eventos" acima, na mesma ordem em que saem para os clientes locais |

Com o uplink desconectado, os eventos são descartados (não acumulam para a
reconexão): o `robot:snapshot` da próxima conexão repõe o quadro.

Back → borda: `robot:command`, **com ack** (callback do socket.io):

```jsonc
// pedido
{ "address": "BDF2B04BC00D2725", "command": "rgb-led", "payload": { "red": 255, "green": 0, "blue": 0 } }

// ack de sucesso - o mesmo corpo do 202 da rota REST
{ "ok": true, "data": { "address": "BDF2B04BC00D2725", "command": "rgb-led", "payload": { ... } } }

// ack de erro
{ "ok": false, "status": 400, "message": "red deve ser no máximo 255" }
```

- `command` e `payload` são os mesmos de `POST /v1/robots/:address/commands/<comando>`,
  validados pelos mesmos DTOs (campo a mais também é recusado).
- `status` segue o HTTP: `400` = comando desconhecido, corpo ou `address`
  inválido; `500` = erro interno da borda; `503` = a borda ainda não tem quem
  execute o comando (só no boot).
- Como no REST, `ok: true` quer dizer "entregue ao gateway", não que o robô executou.
- O back deve usar timeout no ack (`socket.timeout(ms).emitWithAck(...)`):
  sem resposta, trate como borda indisponível.

### Autenticação

`EDGE_AUTH_ACTIVATED=false` (default): aberto. Com `true`, todo cliente manda o
`EDGE_TOKEN`: `Authorization: Bearer <token>` no REST e `auth: { token }` no
socket.io. No uplink o token vai sempre, independente do `EDGE_AUTH_ACTIVATED`
(quem confere é o back). A premissa hoje é **um sistema usando a borda por vez**: não há
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
    Uplink/         socket.io-client até o back (BACKEND_URL, EDGE_ID, reconexão)
    Bridge/         liga o uplink ao Swarm (snapshot) e ao Commands (robot:command validado)
  Websockets/       socket.io: robot:states / robot:status / robot:joined (+ cópia pelo uplink)
  Tests/            HDLC byte a byte contra o marilib (npm test)
```

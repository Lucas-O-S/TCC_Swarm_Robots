# Dar boot na frota antes de subir o backend

Um comando:

```bash
bash scripts/swarm/up.sh
```

Ele descobre a porta do gateway, mostra quem está na malha e coloca em `Running`
todo robô que tenha imagem gravada. É o que falta entre "o robô está ligado" e
"o backend enxerga o robô".

## Por que isso é necessário toda vez

No desenho do swarmit o robô **sempre** boota no bootloader. A imagem persiste
em flash; o estado de execução não. E um robô em `Bootloader` só emite
`SWARMIT_STATUS` — o `MariGateway.Adapter.onEdgePayload()` descarta tudo que não
é `DOTBOT_APP`. Resultado: robô ligado, na malha, com a aplicação gravada, e
**invisível** para o backend.

Então: **todo power-on exige um `swarm start`.** Não é bug, não é firmware
corrompido, não é rede errada. `Last reset: power-on` na tabela é a assinatura.

O que **não** se repete: `flash-mari-gateway` (uma vez por gateway),
`flash-swarmit-sandbox` (uma vez por robô), `swarm flash` (só quando a imagem se
perde — `Image: none` — ou quando você quer trocar a aplicação).

## Uso

```bash
bash scripts/swarm/up.sh                     # todos os robôs
bash scripts/swarm/up.sh CCD2AD7D2EED6472    # só esse (aceita minúsculas)
bash scripts/swarm/up.sh --status            # só mostra, não age
bash scripts/swarm/up.sh --port /dev/tty.X   # força a porta, sem sondar
```

Código de saída: `0` = todos os alvos em `Running`; `1` = algo pendente, e a
mensagem diz o quê.

## Como a porta é descoberta

O critério é o do próprio PyDotBot. `dotbot_utils.serial_interface.get_default_port()`
(pydotbot-utils 0.3.0), que é o default de porta de todo o CLI, faz:

```python
ports = sorted(p for p in list_ports.comports() if p.product == "J-Link")
return ports[0].device if ports else "/dev/ttyACM0"
```

Filtra pelo produto USB `J-Link` e pega o **primeiro em ordem alfabética**. Isso
é um chute educado: o nRF5340DK expõe **duas** VCOM, ambas com produto `J-Link`,
e só uma carrega a malha. No nosso caso a `...667001` vem antes da `...667003` na
ordem alfabética e é a que serve — o default acerta por sorte, não por lógica.

O script reusa a mesma enumeração (pelo pyserial do venv do `dotbot`), mas em vez
de assumir a primeira, **sonda em ordem e adota a primeira que responder com
robôs**. A ordem é:

1. `MARI_PORT` do ambiente, depois o do `Backend/server/.env` — a porta que o
   backend vai usar de fato;
2. as portas `J-Link` na ordem do `get_default_port()`;
3. glob de `/dev/tty.usbmodem*`, `/dev/ttyACM*`, `/dev/cu.usbmodem*`, se o
   pyserial não estiver acessível.

Se a porta que funcionou **não** for a do `.env`, o script avisa e imprime a
linha para corrigir — porque o backend lê o `.env`, não esta descoberta.

## Duas proteções que o script aplica

**Nunca dá `start` em broadcast.** Sempre `-d <ADDR>`, um robô por vez. Um
`start` sem `-d` vai para toda a malha; robô sem imagem trava, o watchdog reseta
e derruba junto quem estava rodando — foi o que aconteceu em 18/09.

**Nunca dá `start` em robô com `Image: none`.** Esse é exatamente o caso que
trava a placa. Em vez disso, imprime o comando de OTA para carregar a aplicação.

## O endereço é case-sensitive — e falha em silêncio

O `-d` do swarmit compara strings sem normalizar (`swarmit/cli/main.py`,
`_filter_by_status`), e as chaves vêm de `addr_to_hex`, que produz
**maiúsculas**. Um `-d ccd2ad7d2eed6472` intersecta a vazio e o comando responde
`No device to start` sem explicar nada. O autor documenta a armadilha em
`controller.py:1167` e aplicou o `.upper()` **só** no `fetch_device_info` (o
comando `device info`); `start`, `stop` e `flash` seguem crus.

Este script normaliza para maiúsculas antes de passar adiante.

## "No device to start" tem dois significados

1. o endereço não casou (minúsculas, ou robô fora da malha);
2. o alvo **já está `Running`** — o filtro só aceita `StatusType.Bootloader`, e
   nesse caso a mensagem é sucesso disfarçado de erro.

Há ainda um terceiro, mais raro: o robô não anunciou dentro do `STATUS_TIMEOUT`
de 2 s do cold start (`swarmit/client/local.py`). Por isso o script reconfere
depois de agir, em vez de confiar na saída do `start`.

## A serial é exclusiva

Um processo por vez em `/dev/tty*`. Antes de rodar, derrube o backend em
`GATEWAY_MODE=mari`, o `scripts/gateway/sniff.mjs` e qualquer `swarm monitor`
esquecido. Se uma porta responder "ocupada", é isso.

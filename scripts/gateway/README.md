# Configurar o gateway (nRF5340DK)

Hardware confirmado: **nRF5340DK + cabo USB**. O DK tem J-Link OB (SEGGER) na
placa, então **não precisa de probe externo** para o gateway — `nrfjprog` acha o
DK sozinho.

Caminho A do `FIRMWARE_ANALISE.md`: firmware pré-compilado, zero linha de C.

## 0. Os dois conectores USB do DK (erro nº 1)

O nRF5340DK tem dois micro-USB:

| Conector | Serigrafia | Para quê |
| --- | --- | --- |
| **J2 / "J-Link"** (lado da borda, perto do botão de power) | `DEBUG IN` / USB do J-Link | flash com `nrfjprog` **e** a porta serial virtual VCOM |
| **J3 / "nRF USB"** | `nRF USB` | USB do próprio nRF5340 (não usado aqui) |

O firmware do gateway fala UART pelo **VCOM do J-Link**. Use o conector J2.
Um DK aparece no mac como duas ou três portas `/dev/tty.usbmodem*`; a do
gateway é a **primeira VCOM (VCOM0)**.

## 1. Toolchain (no macOS, no seu terminal)

```bash
# nRF Command Line Tools 10.24.2 (nrfjprog + J-Link) — instalador da Nordic
#   https://www.nordicsemi.com/Products/Development-tools/nRF-Command-Line-Tools/Download
#   >>> escolha a seção macOS (.dmg). NÃO baixe os arquivos "Linux-arm64"
#       (.deb/.rpm/.tar.gz): arm64 ali é Linux em ARM, não Apple Silicon.
nrfjprog --version          # tem que responder versão do nrfjprog E do JLinkARM

pipx install dotbot-provision      # ou: pip install dotbot-provision
```

A Nordic ARQUIVOU o nRF Command Line Tools e aponta para o nRF Util como
substituto. Instale o arquivado mesmo assim: o `dotbot-provision` chama o binário
`nrfjprog` por nome (`nrf_flash.py`), então `nrfutil device` não substitui.

Com o DK ligado no J2:

```bash
nrfjprog --ids              # tem que listar o serial number do DK (960xxxxxxx)
```

Se `--ids` vier vazio: cabo no conector errado, switch de power em OFF, ou
cabo USB só de carga.

## 2. Baixar as imagens

```bash
dotbot-provision fetch --fw-version 0.8.0
```

**Sem o `v`.** O README do dotbot-provision diz `v0.7.0` e isso dá 404 — as
tags do swarmit não têm prefixo.

Onde os arquivos caem (`DEFAULT_BIN_DIR = Path("bin")`, ajustável com
`--bin-dir`), relativo ao diretório onde você rodou o comando:

```
bin/
  0.8.0/
    03app_gateway_app-nrf5340-app.hex   <- gateway, app core (UART 1 Mbaud + HDLC + IPC)
    03app_gateway_net-nrf5340-net.hex   <- gateway, net core (pilha Mari, MARI_GATEWAY)
    bootloader-dotbot-v3.hex            <- robô, app core seguro
    netcore-nrf5340-net.hex             <- robô, net core
    dotbot-dotbot-v3.bin                <- robô, app non-secure (via OTA)
    config-gateway-0.8.0-0100-<ts>.hex  <- gerado no flash: página de config com o net_id
    config-manifest.json
```

**Você não abre nem move esses arquivos à mão.** O `flash` acha tudo sozinho
via `resolve_fw_root(bin_dir, fw_version)` + a tabela `DEVICE_ASSETS`. Rode
`fetch` e `flash` no MESMO diretório (ou passe o mesmo `--bin-dir` nos dois).

O `config-*.hex` responde a dúvida do net_id: o `dotbot-provision` **gera** um
hex com a página de config (net_id + device id) e grava junto — não é escrita
manual de memória. Por isso o `--network-id` do `flash` é obrigatório.

## 3. Gravar com o network_id

```bash
dotbot-provision flash --device gateway --fw-version 0.8.0 --network-id 0100
```

**Anote o id.** O robô tem que ser flashado com o mesmo. Divergência de
`network_id` = silêncio total, sem nenhuma mensagem de erro em lugar nenhum.

O id é gravado numa página de config do **net core** em `0x0103F800`
(struct `{magic = 0x5753524D "SWRM", has_net_id, net_id}`). Sem config válida o
firmware cai em `MARI_NET_ID_DEFAULT = 1` — é por isso que o
`MARI_NETWORK_ID=0x0001` do `.env.example` funciona por coincidência.

Se preferir não tocar no `.env`, use `--network-id 0001`.

Confira depois:

```bash
dotbot-provision read-config      # tem que devolver network id 0100 + device id
```

Flash manual equivalente (se o CLI travar) — os caminhos são os de `bin/0.8.0/`:

```bash
nrfjprog -f NRF53 --coprocessor CP_NETWORK \
  --program 03app_gateway_net-nrf5340-net.hex --verify --chiperase
nrfjprog -f NRF53 --coprocessor CP_APPLICATION \
  --program 03app_gateway_app-nrf5340-app.hex --verify --chiperase --reset
```

Ordem importa: net core primeiro, app core depois com `--reset`. Neste caminho o
`config-*.hex` **não** é gravado, então o net_id fica no default
`MARI_NET_ID_DEFAULT = 1` — ou você grava o `config-*.hex` gerado pelo CLI como
uma terceira imagem no `CP_NETWORK`, ou assume `MARI_NETWORK_ID=0x0001` no
`.env`. Conferir sempre com `nrfjprog -f NRF53 --coprocessor CP_NETWORK --memrd 0x0103F804 --n 4`.

## 4. Validar o gateway isolado — antes de subir o Nest

```bash
ls /dev/tty.usbmodem*                     # descobre a porta (macOS)
node scripts/gateway/sniff.mjs /dev/tty.usbmodem0000000000001
```

O `sniff.mjs` reproduz a mesma pilha do backend (`HdlcHandler` → `EdgeEvent` →
header Mari de 21 B → `payload_type`), mas só lê. Imprime uma linha por frame,
um resumo a cada 5 s, e um diagnóstico no `ctrl+C`.

O que esperar:

- **Só com o gateway ligado**: `GATEWAY_INFO` e/ou `NODE_KEEP_ALIVE`. Já prova
  HDLC + baudrate + porta.
- **Com o robô ligado também**: `NODE_JOINED` uma vez, depois `NODE_DATA` com
  `proto=DOTBOT_APP payload=DOTBOT_ADVERTISEMENT` e `proto=SWARMIT_STATUS` a
  ~1 Hz (o `SWARMIT_STATUS` (`next_proto 0x10`) o adapter descarta de
  propósito — não é erro).

Leitura do diagnóstico:

| Sintoma | Causa |
| --- | --- |
| `bytes lidos: 0` | porta errada (VCOM1 em vez de VCOM0), cabo no `nRF USB`, ou gateway não flashado |
| bytes > 0, `frames HDLC ok: 0` | baudrate errado (tem que ser 1000000) ou app core sem o firmware do gateway |
| frames ok, `nós vistos: nenhum` | gateway OK; robô desligado ou com `network_id` diferente |
| `Resource temporarily unavailable` | a porta já está aberta — backend rodando em `GATEWAY_MODE=mari` |

**Só um processo pode abrir a porta.** Derrube o backend antes de rodar o
sniffer, e o sniffer antes de subir o backend.

`RAW=1 node scripts/gateway/sniff.mjs` imprime também o hex cru de cada frame.

## 5. Ligar no backend

`Backend/server/.env`:

```env
GATEWAY_MODE=mari
MARI_NETWORK_ID=0x0100                            # igual ao --network-id do flash
MARI_PORT=/dev/tty.usbmodem0000000000001          # a porta real do passo 4
MARI_BAUDRATE=1000000
```

Nada de código muda: o contrato (header Mari de 21 B, payload de app sem header
extra, `next_proto 0x11`, 1 Mbaud) já foi conferido contra o
`MariGatewayAdapter`.

## 6. Depois do gateway

Aí sim o robô: mesmo `--network-id`, conferir o auto-cadastro por
`DOTBOT_ADVERTISEMENT (0x06)`, testar `CMD_RGB_LED (0x01)` e só depois
`CMD_MOVE_RAW (0x00)` com o robô suspenso.

**Incógnita que sobra:** o robô é DotBot **v2 ou v3**, e ele tem programador
próprio? `dotbot-provision` só aceita `--device dotbot-v3`; se for v2 o firmware
existe (`bootloader-dotbot-v2.hex`, `dotbot-sandbox-dotbot-v2.bin`) mas o flash
é manual com `nrfjprog` e o `net_id` vai escrito à mão. O DK também pode servir
de probe externo para o robô (header P19/`DEBUG OUT`) se o robô não tiver
DAPLink.

## Apêndice — alternativa: DotBot v3 como gateway Mari

O projeto Mari documenta usar um **DotBot v3 como gateway**, no lugar do
nRF5340DK (página "Using DotBot-v3 as Mari Gateway" na wiki do CrystalFree).
Faz sentido porque o DotBot v3 também é nRF5340: o que muda é só qual imagem
vai em cada core e por onde sai a UART.

Quando isso interessa aqui:

- **Não interessa para o gateway**, já que o nRF5340DK existe e é o alvo de
  primeira classe do `dotbot-provision` (`--device gateway`).
- **Interessa como plano B** se o DK falhar, e como leitura obrigatória antes de
  flashar o robô: se o robô for v3, as duas máquinas usam o mesmo SoC e a
  diferença passa a ser só a imagem gravada.

PENDENTE: a página é da wiki Confluence do CrystalFree e não foi lida ainda —
conferir o caminho da UART (o DotBot não tem J-Link OB nem VCOM como o DK, então
a serial tem que sair por USB nativo ou por um probe externo) antes de tratar
como plano B viável.

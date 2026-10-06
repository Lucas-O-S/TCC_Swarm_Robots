# Carregar a aplicação DotBot no robô (OTA)

Estado que torna este passo necessário (medido em 2026-09-15): o robô entra na
malha e emite `NODE_KEEP_ALIVE` + `NODE_DATA / SWARMIT_STATUS`, mas **nunca**
`DOTBOT_APP`. O net core (rádio, stack swarmit) está gravado; o app core tem só
o bootloader TrustZone, e a área non-secure — a aplicação — está vazia.

O `MariGateway.Adapter` descarta tudo que não seja `NextProto.DOTBOT_APP`, então
enquanto a aplicação não subir a API recebe os frames e joga todos fora, sem
erro e sem robô cadastrado. Não é bug do backend.

## Por que não dá para gravar por cabo

No desenho do swarmit a aplicação non-secure é entregue **pelo rádio**: o
bootloader seguro a recebe pela malha Mari e escreve na região non-secure. Por
isso o `dotbot-provision flash` não a coloca lá, e por isso o
`dotbot-dotbot-v3.bin` dá 404 na release do swarmit — esse binário não é imagem
de gravação, e o nome real dele é outro (ver abaixo).

## Os binários (já baixados aqui)

Da release **1.22.0 do DotBot-firmware** (repositório diferente do swarmit):

| arquivo | sha256 | o que é |
| --- | --- | --- |
| `dotbot-sandbox-dotbot-v3.bin` | `654ca3dc007e69b0d1f5932a600172c39c65515e8656c4c57792307f028d181e` | aplicação DotBot completa — é esta que queremos |
| `dotbot-simple-sandbox-dotbot-v3.bin` | `b049b543224287d999571308fe5c1b344ebc6d38bf3487a1565920aa500457b8` | versão mínima, útil só para provar que o OTA funciona |

Os dois sha256 foram conferidos contra a página da release.

## Pré-requisitos

```bash
pipx install swarmit        # ou: pip install swarmit
```

O `swarmit` fala pela MESMA serial do gateway. Só um processo abre a porta:
**derrube o sniffer e a API antes.**

## Sequência

Parâmetros deste setup — a rede é `0xFFFF`, não `0x0001` (ver
`rede_mari_estado_real` na memória do projeto); o default do CLI é `0x1200`, e
errar isso resulta em silêncio total, sem mensagem de erro.

```bash
cd ~/Downloads/TCC_Swarm_Robots-1

PORT=/dev/tty.usbmodem0010500667003
NET=0xFFFF
ROBOT=DAC609B86A7DB915

# 1. o robô tem que aparecer aqui antes de qualquer coisa
swarmit -p $PORT -b 1000000 -n $NET status

# 2. parar a aplicação atual (idempotente; com a área vazia não faz nada)
swarmit -p $PORT -b 1000000 -n $NET stop

# 3. enviar a aplicação pelo ar
swarmit -p $PORT -b 1000000 -n $NET -d $ROBOT flash firmware/robot/dotbot-sandbox-dotbot-v3.bin

# 4. dar partida
swarmit -p $PORT -b 1000000 -n $NET start
```

Sem `-d` o comando atinge todos os robôs prontos da rede; com um robô só, tanto
faz, mas explicitar evita surpresa quando o enxame crescer.

## Critério de pronto

Rode o sniffer de novo:

```bash
node scripts/gateway/sniff.mjs $PORT
```

O alvo é ver **`proto=DOTBOT_APP payload=DOTBOT_ADVERTISEMENT`**. Enquanto só
aparecer `SWARMIT_STATUS`, a aplicação não está rodando — nesse caso tente o
`dotbot-simple-sandbox-dotbot-v3.bin` para isolar se o problema é o OTA em si
ou a aplicação completa.

Com o `DOTBOT_ADVERTISEMENT` no ar: subir a API (`GATEWAY_MODE=mari`), conferir
o auto-cadastro, testar `CMD_RGB_LED (0x01)` e só depois `CMD_MOVE_RAW (0x00)`,
com o robô **suspenso**, sem encostar no chão.

## Observações não verificadas

- A sequência `status → stop → flash → start` segue o ciclo de vida do CLI, mas
  o README do swarmit não documenta um fluxo ordenado — confirmar com
  `swarmit --help` e `swarmit flash --help` na primeira execução.
- O `swarmit` também tem `monitor`, que pode substituir o `sniff.mjs` para
  acompanhar a aplicação rodando.

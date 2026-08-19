# Comandar a frota inteira de uma vez

Utilitários que buscam a lista de robôs em `GET /robots` e disparam o mesmo
comando (`PUT /robots/:address/...`) para **todos** em paralelo. Substitui
mandar um `curl` por robô — o mesmo comando que você faz num só robô, agora na
frota toda.

Dois jeitos, mesma coisa:

- **`frota.mjs`** — Node 18+, sem dependências (recomendado).
- **`frota.sh`** — bash puro, precisa de `curl` + `jq`.

Por padrão apontam para `http://localhost:3000` e não mandam token (o backend
sobe com `AUTH_ACTIVATED=false`). Ajuste com as variáveis `API_URL` e `TOKEN`.

## Node (`frota.mjs`)

> **Pegadinha do move-raw (tração diferencial):** o comando usa `left_y` como
> PWM da **roda esquerda** e `right_y` como PWM da **roda direita**. Os eixos
> `left_x`/`right_x` são **ignorados** (igual ao firmware do DotBot). Então
> `--left_x 100` **não move nada** — para andar pra frente use
> `--left_y 100 --right_y 100`, ou os atalhos `frente`/`tras`/`girar`.

```bash
node frota.mjs list                                  # confere quem responde
node frota.mjs frente --speed 100                    # anda pra frente (atalho)
node frota.mjs tras   --speed 100                    # anda pra tras
node frota.mjs girar  --speed 100                    # gira no proprio eixo
node frota.mjs move-raw --left_y 100 --right_y 100   # equivalente ao "frente"
node frota.mjs stop                                  # move-raw tudo em 0
node frota.mjs rgb --red 255 --green 0 --blue 0
node frota.mjs mode --mode 1                         # 0=Manual, 1=Auto
node frota.mjs waypoints --threshold 100 --points "1000,2000;1500,300"
node frota.mjs move-raw --body '{"left_x":100,"left_y":0,"right_x":0,"right_y":0}'
```

Filtros e opções (valem para qualquer comando):

```bash
node frota.mjs move-raw --left_x 100 --status 1      # só robôs status=1
node frota.mjs stop --only eba310d5f5bd07be,a1b2c3d4e5f60708
node frota.mjs rgb --red 255 --dry-run               # mostra sem enviar
API_URL=http://192.168.0.10:3000 node frota.mjs list
TOKEN=xxx node frota.mjs mode --mode 1               # se a auth estiver ligada
```

## Bash (`frota.sh`)

```bash
chmod +x frota.sh
./frota.sh list
./frota.sh move-raw '{"left_x":100,"left_y":0,"right_x":0,"right_y":0}'
./frota.sh stop
./frota.sh rgb-led '{"red":255,"green":0,"blue":0}'
./frota.sh control-mode '{"mode":1}'
./frota.sh waypoints '{"threshold":100,"waypoints":[{"x":1000,"y":2000}]}'
```

## Comandos e payloads (contrato do backend)

| Comando         | Rota                                | Body                                            |
| --------------- | ----------------------------------- | ----------------------------------------------- |
| `move-raw`      | `PUT /robots/:address/move-raw`     | `{left_x, left_y, right_x, right_y}` (−128..127) |
| `rgb` / rgb-led | `PUT /robots/:address/rgb-led`      | `{red, green, blue}` (0..255)                    |
| `mode`          | `PUT /robots/:address/control-mode` | `{mode}` (0=Manual, 1=Auto)                      |
| `waypoints`     | `PUT /robots/:address/waypoints`    | `{threshold, waypoints:[{x,y}]}`                 |
| `assign`        | `PUT /orchestrator/robots/:address/assign` | `{taskId}`                              |

## Testar sem o backend

`mock.mjs` sobe um servidor fake em `:3000` que responde `GET /robots` e aceita
os `PUT`, imprimindo o que chega — bom para validar os scripts:

```bash
node mock.mjs &        # sobe o mock
node frota.mjs move-raw --left_x 100
kill %1                # derruba o mock
```

## Fluxo ponta-a-ponta (com o simulador)

Para os comandos moverem robôs de verdade sem hardware: suba o broker MQTT e o
gateway simulado (`RobotSwarmSimulator`), aponte o backend para o mesmo broker e
então use estes scripts. O `move-raw` broadcast deve aparecer como `⇩ move-raw`
no log do gateway simulado.

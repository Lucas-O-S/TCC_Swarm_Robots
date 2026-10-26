# Deploy na AWS (Learner Lab) — do zero

Front e back rodando na nuvem, com HTTPS, e o robô real continuando ligado no seu Mac.

```
 Navegador ──HTTPS──►  EC2 na AWS (1 máquina, 3 containers)           Seu Mac
                       ├─ web      Caddy: front + certificado HTTPS   ├─ Edge/server (borda, :3001)
                       ├─ backend  NestJS ─────── Tailscale ────────► │   └─ USB ─ gateway ─ rádio ─ robô
                       └─ db       Postgres (sem porta pública)
```

- **Uma máquina só (EC2)** com Docker. Nada de serviço gerenciado: é o mesmo `docker compose` que você já usa no dev.
- **Endereço grátis com HTTPS**: o [sslip.io](https://sslip.io) transforma o IP em nome (`54-12-34-56.sslip.io` → `54.12.34.56`) e o Caddy tira o certificado sozinho.
  - Front: `https://54-12-34-56.sslip.io`
  - API + Swagger: `https://api.54-12-34-56.sslip.io` (`/api` = Swagger)
- **A borda fica no Mac** (precisa do USB do gateway). O back na nuvem chega nela por uma rede privada grátis, o [Tailscale](https://tailscale.com). A borda **não** fica exposta na internet.

Arquivos desta pasta:

| Arquivo | Para quê |
|---|---|
| `docker-compose.yml` | Sobe `db`, `backend` e `web` |
| `Caddyfile` | Domínio, HTTPS, rotas da SPA e proxy da API |
| `.env.example` | Modelo das variáveis (senhas, domínio, borda) |
| `setup-ec2.sh` | Prepara a EC2 do zero (Docker, swap, Tailscale, `.env`) |
| `../Backend/server/Dockerfile` | Imagem da API |
| `Frontend/Dockerfile` (na branch do front) | Build do Vite servido pelo Caddy |

## Limites do Learner Lab que importam

- **Região: só `us-east-1` (N. Virginia).** Use essa em tudo.
- **A sessão do lab acaba** (o contador fica na página do lab) e a AWS **desliga** a EC2. Na próxima sessão você liga de novo (ver "Dia a dia"). Os dados e o site voltam sozinhos.
- **Créditos**: `t3.small` ≈ US$ 0,02/h + IP elástico ≈ US$ 0,005/h + disco 20 GB ≈ US$ 1,60/mês. O orçamento aparece na página do lab.
- **Nunca clique em "Terminate"** na instância: apaga a máquina e o banco.

## Antes de começar

1. **Código no GitHub**: os arquivos de deploy precisam estar nas branches que você vai clonar:
   - branch do back: esta pasta `deploy/` + `Backend/server/Dockerfile` + `Backend/server/.dockerignore`
   - branch do front: `Frontend/Dockerfile` + `Frontend/.dockerignore`
   - o front tem que passar no **`npm run build`** (em `Frontend/`, no seu Mac). É o mesmo comando que roda na EC2: se der `error TS...` aí, o deploy do front falha igual.
2. **Conta no Tailscale** (grátis): entre em <https://login.tailscale.com> com GitHub ou Google.
3. **Se o repositório for privado**: crie um token no GitHub (Settings → Developer settings → Personal access tokens → *Fine-grained* → acesso só a este repo, permissão *Contents: Read-only*). Ele é a "senha" no `git clone`.

---

## Passo 1 — Abrir o console da AWS

1. AWS Academy → seu curso → **Modules** → **Learner Lab**.
2. **Start Lab** e espere a bolinha ao lado de "AWS" ficar **verde**.
3. Clique em **AWS** (abre o console).
4. No canto superior direito, confira a região: **N. Virginia (us-east-1)**.

## Passo 2 — Criar a máquina (EC2)

Na busca do console digite **EC2** → **Launch instance**:

| Campo | Valor |
|---|---|
| Name | `tcc-server` |
| Application and OS Images | **Amazon Linux 2023** (já vem selecionado) |
| Instance type | **t3.small** (a `t3.micro` tem pouca memória pro build) |
| Key pair | **vockey** |
| Network settings | marque **Allow SSH traffic from Anywhere**, **Allow HTTPS traffic from the internet** e **Allow HTTP traffic from the internet** |
| Configure storage | **20** GiB, **gp3** |
| Advanced details → IAM instance profile | **LabInstanceProfile** (plano B de terminal, ver passo 4) |

**Launch instance** → **View all instances**. Espere o *Instance state* ficar **Running**.

## Passo 3 — IP fixo (Elastic IP)

Sem isso o IP muda toda vez que o lab reinicia — e o endereço do site muda junto.

1. Menu da esquerda: **Network & Security → Elastic IPs** → **Allocate Elastic IP address** → **Allocate**.
2. Selecione o IP criado → **Actions → Associate Elastic IP address** → *Instance*: `tcc-server` → **Associate**.
3. Anote o IP. Exemplo: `54.12.34.56` → seu domínio é `54-12-34-56.sslip.io` (pontos viram traços).

## Passo 4 — Abrir o terminal da máquina

**Instances** → marque `tcc-server` → **Connect** → aba **EC2 Instance Connect** → **Connect**.

Abre um terminal no navegador. Todos os comandos daqui pra frente são colados nele (colar: `Cmd+V` no Mac).

> Não conectou? Mesma tela, aba **Session Manager** → **Connect**, e rode `sudo su - ec2-user` antes de tudo.

## Passo 5 — Baixar o código

Troque `<branch-do-back>` e `<branch-do-front>` pelas branches que têm os arquivos de deploy (ex.: `dev-Back` e `dev-Front`):

```bash
sudo dnf install -y git
mkdir -p ~/tcc && cd ~/tcc
git clone -b <branch-do-back>  https://github.com/Lucas-O-S/TCC_Swarm_Robots.git back
git clone -b <branch-do-front> https://github.com/Lucas-O-S/TCC_Swarm_Robots.git front
```

Repo privado: *Username* = seu usuário do GitHub, *Password* = o token (não aparece nada enquanto você cola, é normal).

> Front e back na mesma branch (ex.: `main` com tudo)? Clone uma vez só, como `back`, e depois do passo 6 troque `FRONT_DIR=../../front` por `FRONT_DIR=..` no `.env`.

## Passo 6 — Preparar a máquina (um comando)

```bash
bash ~/tcc/back/deploy/setup-ec2.sh
```

Leva uns 2–3 minutos. Ele instala Docker, Docker Compose, Buildx, git e Tailscale, cria 2 GB de swap (memória extra pro build) e gera o `deploy/.env` com:

- `DOMAIN` a partir do IP público — **confira se é o IP elástico do passo 3**;
- senha do banco, `JWT_SECRET` e `EDGE_TOKEN` aleatórios.

Pode rodar de novo quantas vezes quiser: ele pula o que já está feito e nunca sobrescreve o `.env`.

## Passo 7 — Colocar a EC2 no Tailscale

```bash
sudo tailscale up --hostname tcc-aws --accept-dns=false
```

(`--accept-dns=false`: a EC2 continua usando o DNS da AWS; a borda é acessada pelo IP `100.x`, sem precisar do DNS do Tailscale.)

Aparece um link `https://login.tailscale.com/a/...`. Abra no navegador do Mac, entre na sua conta e clique **Connect**.

Recomendado: em <https://login.tailscale.com/admin/machines>, na máquina `tcc-aws`, menu **⋯ → Disable key expiry** (senão ela sai da rede em 180 dias).

## Passo 8 — Colocar o Mac no Tailscale e proteger a borda

No **Mac**:

1. Instale o Tailscale: <https://tailscale.com/download> → macOS. Abra e faça login com a **mesma conta**.
2. Pegue o IP do Mac na rede Tailscale: ícone do Tailscale na barra de menus → seu Mac → copie o endereço **`100.x.y.z`**.
3. Na EC2, mostre o token gerado:
   ```bash
   grep EDGE_TOKEN ~/tcc/back/deploy/.env
   ```
4. No **`Edge/server/.env` do Mac**, ligue o token com esse mesmo valor:
   ```
   EDGE_AUTH_ACTIVATED=true
   EDGE_TOKEN=<o valor que apareceu na EC2>
   ```
   Se você também roda o `Backend` local no Mac apontando para essa borda, ponha o mesmo `EDGE_TOKEN` no `Backend/server/.env` dele.
5. Suba a borda como sempre (`npm run start:hw` ou `npm run start` em `Edge/server`). Se o macOS perguntar se o `node` pode aceitar conexões, **Permitir**.
6. **O Mac não pode dormir** enquanto o robô estiver em uso. Deixe um terminal aberto com:
   ```bash
   caffeinate -dims
   ```
   (`Ctrl+C` para soltar.)

## Passo 9 — Apontar o back para a borda

Na **EC2**:

```bash
nano ~/tcc/back/deploy/.env
```

Troque a linha `EDGE_URL` pelo IP do Mac do passo 8:

```
EDGE_URL=http://100.x.y.z:3001
```

Salvar e sair do `nano`: `Ctrl+O`, `Enter`, `Ctrl+X`.

Teste se a EC2 enxerga a borda (com a borda rodando no Mac):

```bash
set -a; . ~/tcc/back/deploy/.env; set +a
curl -H "Authorization: Bearer $EDGE_TOKEN" "$EDGE_URL/v1/robots"
```

Respondeu um JSON → ok. Travou ou deu erro → tabela de problemas no fim.

## Passo 10 — Subir tudo

```bash
cd ~/tcc/back/deploy
sudo docker compose up -d --build
```

A primeira vez demora (5–10 min: instala dependências e compila front e back). Depois:

```bash
sudo docker compose ps
```

Os três (`db`, `backend`, `web`) devem estar **running** (o `db` também **healthy**).

Abra `https://<seu DOMAIN>` (ex.: `https://54-12-34-56.sslip.io`). No primeiro acesso o certificado pode levar ~1 minuto para sair.

## Passo 11 — Criar o primeiro usuário

O `.env` sobe com `AUTH_ACTIVATED=true`, então o front pede login.

1. Abra `https://api.<seu DOMAIN>/api` (Swagger).
2. **Auth → POST /auth/register → Try it out**, preencha `username` e `password` → **Execute**.
3. Entre no front com esse usuário.

> `/auth/register` é público: quem tiver o endereço consegue criar conta. Para fechar isso é preciso mudar o back.

---

## Dia a dia no Learner Lab

**Ligar** (a cada sessão nova):

1. **Start Lab** → bolinha verde → **AWS**.
2. **EC2 → Instances → `tcc-server` → Instance state → Start instance**.
3. Espere 1–2 min. Docker, containers e Tailscale sobem sozinhos; o site volta no mesmo endereço.
4. No Mac: Tailscale ligado, borda rodando, `caffeinate -dims`.

**Desligar**: o lab desliga sozinho no fim da sessão. Para economizar crédito antes disso: **Instance state → Stop instance**. Nunca *Terminate*.

## Atualizar depois de um merge

```bash
cd ~/tcc/back  && git pull
cd ~/tcc/front && git pull
cd ~/tcc/back/deploy && sudo docker compose up -d --build
```

## Comandos úteis (sempre dentro de `~/tcc/back/deploy`)

| O quê | Comando |
|---|---|
| Ver o estado | `sudo docker compose ps` |
| Logs do back ao vivo (`Ctrl+C` sai) | `sudo docker compose logs -f backend` |
| Logs do Caddy/HTTPS | `sudo docker compose logs web` |
| Reiniciar só o back | `sudo docker compose restart backend` |
| Mudou o `.env` | `sudo docker compose up -d` |
| Mudou `DOMAIN` ou `VITE_*` (gravados no build do front) | `sudo docker compose up -d --build` |
| Parar tudo (mantém os dados) | `sudo docker compose down` |

## Banco

- Os dados ficam no volume `tcc_db_data` e sobrevivem a restart, rebuild e `down`.
- O `init.sql` **só roda na primeira subida** (volume vazio). Mudança de schema depois disso é SQL manual:
  ```bash
  sudo docker compose exec -T db psql -U adm -d mari_database < ../Backend/server/database/sql/<arquivo>.sql
  ```
- Backup: `sudo docker compose exec -T db pg_dump -U adm mari_database > ~/backup.sql`
- Zerar o banco (**apaga tudo**) e recriar pelo `init.sql`:
  ```bash
  sudo docker compose down
  sudo docker volume rm tcc_db_data
  sudo docker compose up -d
  ```

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Site não abre (timeout) | Instância parada ou portas 80/443 fechadas | Instância **Running**? Em **Security → Security groups → Edit inbound rules**, ter HTTP 80 e HTTPS 443 de `0.0.0.0/0` |
| Erro de certificado nos primeiros minutos | Caddy ainda tirando o certificado | Esperar 1–2 min; ver `sudo docker compose logs web` |
| Front abre, mas login/robôs dão erro de rede | `DOMAIN` errado (front compilado com outro IP) | `DOMAIN` = IP elástico com traços; depois `sudo docker compose up -d --build` |
| Comandos ao robô respondem **503** | O back não alcança a borda | Mac acordado? Borda rodando? Tailscale ligado nos dois? `EDGE_URL` certo? Refaça o teste do passo 9 |
| Comandos respondem **502** | Token diferente entre EC2 e Mac | Mesmo `EDGE_TOKEN` nos dois `.env` e `EDGE_AUTH_ACTIVATED=true` na borda; reiniciar a borda |
| Build do `web` falha com `error TS...` | Erro de tipo no front (o `npm run build` roda `tsc -b` antes do Vite) | Corrigir no código, conferir com `npm run build` no Mac, fazer push e repetir o "Atualizar" |
| Build morre com `Killed` / código 137 | Falta de memória | `free -h` deve mostrar swap de 2G; se mostrar, troque para `t3.medium` (Actions → Instance settings → Change instance type, com a instância parada) |
| Instance Connect não conecta | Porta 22 fechada | Inbound rule SSH 22 de `0.0.0.0/0`, ou use o Session Manager |
| O endereço mudou | IP elástico não associado | Passo 3; depois corrija `DOMAIN` no `.env` e `sudo docker compose up -d --build` |
| `git pull` pede senha toda vez | Repo privado | Usar o token como senha; ou `git config --global credential.helper store` (grava o token em texto puro na EC2) |

## Segurança (o mínimo)

- `deploy/.env` tem senhas: **nunca** faça commit (já está no `.gitignore` desta pasta).
- O Postgres não tem porta aberta para a internet; só o `backend` enxerga.
- A borda só é acessível pela rede Tailscale e exige `EDGE_TOKEN`.
- Mantenha `AUTH_ACTIVATED=true` em servidor público.

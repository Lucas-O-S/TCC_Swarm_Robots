# TCC_Swarm_Robots

Backend em NestJS + PostgreSQL para controle de enxame de robôs (arquitetura inspirada no [PyDotBot](https://github.com/DotBots/PyDotBot)).

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para o PostgreSQL)

## Como rodar

### 1. Subir o banco de dados

Na pasta `Backend`, o Docker sobe o Postgres e aplica o schema automaticamente (`init.sql`):

```bash
cd Backend
docker compose up -d
```

O `init.sql` só roda na **primeira** criação do volume. Para recriar o banco do zero:

```bash
docker compose down -v
docker compose up -d
```

### 2. Configurar variáveis de ambiente

Copie ou confira o arquivo `Backend/server/.env`. Os valores padrão já batem com o `docker-compose.yml`:

| Variável     | Valor            |
| ------------ | ---------------- |
| `DB_HOST`    | `localhost`      |
| `DB_PORT`    | `5432`           |
| `DB_USERNAME`| `adm`            |
| `DB_PASSWORD`| `123456`         |
| `DB_NAME`    | `mari_database`  |

### 3. Iniciar o servidor

```bash
cd Backend/server
npm install
npm run start:dev
```

Use `npm run start` para rodar sem hot-reload, ou `npm run start:prod` após `npm run build`.

> **Atenção:** use `npm run start`, não `npx run start`. O segundo executa um pacote diferente e vai falhar.

### 4. Acessar a API

- API: [http://localhost:3000](http://localhost:3000)
- Swagger: [http://localhost:3000/api](http://localhost:3000/api)

## Estrutura do projeto

```
Backend/
  docker-compose.yml      # PostgreSQL
  server/                 # NestJS (API)
    database/sql/init.sql # Schema inicial
Frontend/                 # (em breve)
```

Mais detalhes de arquitetura e decisões técnicas em [`AGENTS.md`](AGENTS.md).

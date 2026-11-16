# Testes do Backend

Suíte do Módulo C do Projeto Final de Qualidade de Software. Os casos seguem a
especificação do Módulo B (seção 2.5): o nome de cada teste começa pelo ID do
caso (CT-07-11, por exemplo).

## Estrutura

| Pasta / arquivo | Conteúdo |
|---|---|
| `test/api/` | Testes de API (caixa-preta), um arquivo por requisito: RF01, RF02, RF05, RF06, RF07, RF08 e RF09 |
| `test/helpers/` | App de teste com a borda simulada, banco de teste e chamadas autenticadas |
| `test/setup/env.ts` | Carrega o `test/.env.test` antes dos testes |
| `src/**/*.spec.ts` | Testes unitários (caixa-branca) do `OrchestratorService` e do `RobotService` |

A borda (Edge) não é usada: o `EdgeClient` e o estado da frota (`SwarmService`)
são substituídos por mocks.

## Preparar o banco de teste (uma vez)

Os testes de API usam o banco `mari_test` no mesmo Postgres do docker-compose:

```bash
cd Backend
docker compose up -d db
docker compose exec db createdb -U adm mari_test
docker compose exec db psql -U adm -d mari_test -f /docker-entrypoint-initdb.d/init.sql
```

## Rodar

Dentro de `Backend/server`:

```bash
npm run test:e2e        # testes de API (68 casos)
npm run test:e2e:cov    # testes de API com cobertura (coverage/e2e)
npm run test:cov        # testes unitários com cobertura (coverage)
```

## Teste de carga (k6)

O script `test/carga/carga.js` sobe até 20 usuários simultâneos que repetem
três rotas que não dependem da borda: login, listagem de tasks e status do
robô. O resumo mostra média, p95 e máximo de cada rota e a taxa de erro, e os
números completos ficam em `test/carga/resultado.json`.

Instalar o k6 (uma vez): `brew install k6`.

Em dois terminais, dentro de `Backend/server`:

```bash
npm run start:carga     # terminal 1: backend usando o banco de teste (test/.env.test)
npm run test:carga      # terminal 2: roda o teste (cerca de 1 minuto)
```

O backend precisa estar no ar antes de rodar o `test:carga`. Para apontar para
outro endereço: `k6 run -e BASE_URL=http://host:porta test/carga/carga.js`.

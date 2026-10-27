# Imagem de produção da API (NestJS). Usada pelo deploy/docker-compose.yml,
# mas funciona sozinha: docker build -t tcc-backend . && docker run --env-file .env -p 3000:3000 tcc-backend
#
# Estágio 1: instala tudo (inclusive devDependencies) e compila o TypeScript.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# Estágio 2: só o JS compilado + dependências de produção.
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main"]

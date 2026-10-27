# Imagem de produção do front: compila o Vite e serve os arquivos estáticos
# com o Caddy. A configuração do Caddy (domínio, HTTPS, fallback da SPA) vem
# do deploy/Caddyfile, montado pelo deploy/docker-compose.yml.
#
# As VITE_* são lidas na hora do BUILD (ficam gravadas no JS), por isso
# entram como build args e não como variáveis de ambiente do container.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ARG VITE_MARI_NETWORK_ID=0x1200
ARG VITE_MQTT_WS_URL=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_MARI_NETWORK_ID=$VITE_MARI_NETWORK_ID \
    VITE_MQTT_WS_URL=$VITE_MQTT_WS_URL
RUN test -n "$VITE_API_URL" || (echo "ERRO: VITE_API_URL vazio (build arg)" && exit 1)
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv

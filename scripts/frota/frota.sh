#!/usr/bin/env bash
# frota.sh — versão em bash puro (curl + jq) do broadcaster de comandos.
# Busca a lista em GET /robots e faz o PUT em cada address, em paralelo.
#
# Requisitos: curl e jq.
#
# Uso:
#   ./frota.sh list
#   ./frota.sh move-raw '{"left_x":100,"left_y":0,"right_x":0,"right_y":0}'
#   ./frota.sh stop
#   ./frota.sh rgb-led '{"red":255,"green":0,"blue":0}'
#   ./frota.sh control-mode '{"mode":1}'
#   ./frota.sh waypoints '{"threshold":100,"waypoints":[{"x":1000,"y":2000}]}'
#
# Ambiente:
#   API_URL  base da API (padrão http://localhost:3000)
#   TOKEN    Bearer token (opcional)
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
API_URL="${API_URL%/}"
CMD="${1:-}"
BODY="${2:-}"

auth=()
[ -n "${TOKEN:-}" ] && auth=(-H "Authorization: Bearer ${TOKEN}")

if ! command -v jq >/dev/null 2>&1; then
  echo "jq não encontrado. Instale (brew install jq) ou use: node frota.mjs" >&2
  exit 1
fi

# addresses ativos (deletedAt == null)
addrs="$(curl -fsS "${auth[@]}" "${API_URL}/robots" \
  | jq -r '.data[] | select(.deletedAt == null) | .address')"

if [ -z "$addrs" ]; then
  echo "Nenhum robô encontrado em ${API_URL}/robots" >&2
  exit 1
fi

count="$(echo "$addrs" | wc -l | tr -d ' ')"

if [ "$CMD" = "list" ] || [ -z "$CMD" ]; then
  echo "$count robô(s) em ${API_URL}/robots:"
  curl -fsS "${auth[@]}" "${API_URL}/robots" \
    | jq -r '.data[] | select(.deletedAt == null) | "  \(.address)  status=\(.status) bat=\(.battery) mode=\(.mode)  \(.name)"'
  exit 0
fi

# atalho "stop"
if [ "$CMD" = "stop" ]; then
  CMD="move-raw"; BODY='{"left_x":0,"left_y":0,"right_x":0,"right_y":0}'
fi

if [ -z "$BODY" ]; then
  echo "Uso: ./frota.sh <rota> '<json>'   (ex.: ./frota.sh move-raw '{\"left_x\":100,\"left_y\":0,\"right_x\":0,\"right_y\":0}')" >&2
  exit 1
fi

echo "Enviando \"${CMD}\" -> ${count} robô(s)  (${API_URL})"
echo "body: ${BODY}"

send_one() {
  local addr="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
    -H "Content-Type: application/json" -H "accept: */*" "${auth[@]}" \
    -d "$BODY" "${API_URL}/robots/${addr}/${CMD}")
  case "$code" in 2*) : ;; *) echo "  FALHA ${addr}  HTTP ${code}" ;; esac
}

# dispara em paralelo, em lotes de 16
n=0
while IFS= read -r addr; do
  [ -z "$addr" ] && continue
  send_one "$addr" &
  n=$((n + 1))
  if [ $((n % 16)) -eq 0 ]; then wait; fi
done <<< "$addrs"
wait

echo "Concluído."

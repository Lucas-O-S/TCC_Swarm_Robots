#!/usr/bin/env bash
# Diagnóstico do ambiente de provisionamento do gateway (macOS).
# Roda tudo que dá pra checar SEM a placa, depois o que exige a placa.
# Uso:  bash scripts/gateway/check.sh
#
# Não altera nada. Só lê e reporta.

FW_VERSION="${FW_VERSION:-0.8.0}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

green()  { printf '  \033[32mOK\033[0m    %s\n' "$1"; }
red()    { printf '  \033[31mFALTA\033[0m %s\n' "$1"; }
warn()   { printf '  \033[33mAVISO\033[0m %s\n' "$1"; }
info()   { printf '        %s\n' "$1"; }
title()  { printf '\n\033[1m%s\033[0m\n' "$1"; }

BLOCKERS=0
block() { red "$1"; BLOCKERS=$((BLOCKERS+1)); }

title "1. Toolchain de gravação (não precisa da placa)"

if command -v nrfjprog >/dev/null 2>&1; then
  NRF_OUT="$(nrfjprog --version 2>&1)"
  NRF_VER="$(printf '%s' "$NRF_OUT" | sed -n 's/^nrfjprog version: *\([^ ]*\).*/\1/p')"
  JLINK_VER="$(printf '%s' "$NRF_OUT" | sed -n 's/^JLinkARM.dll version: *\([^ ]*\).*/\1/p')"
  green "nrfjprog ${NRF_VER:-?}"

  if printf '%s' "$NRF_OUT" | grep -q '\-256'; then
    block "nrfjprog carrega o J-Link mas dá erro -256"
    info  "versão do J-Link incompatível. Aponte /Applications/SEGGER/JLink para uma 7.9x:"
    info  "  sudo rm /Applications/SEGGER/JLink"
    info  "  sudo ln -s /Applications/SEGGER/JLink_V794e /Applications/SEGGER/JLink"
  elif [ -z "$JLINK_VER" ]; then
    block "nrfjprog não reporta versão do JLinkARM — J-Link não instalado?"
  else
    case "$JLINK_VER" in
      7.9*) green "JLinkARM $JLINK_VER (faixa compatível com nrfjprog 10.24.x)" ;;
      *)    warn "JLinkARM $JLINK_VER — fora da faixa 7.9x; risco de erro -256"
            info "NUNCA aceitar update de J-Link (nRF Connect vai sugerir a 9.24a). Ver scripts/gateway/README.md" ;;
    esac
  fi
else
  block "nrfjprog não encontrado no PATH"
  info  "nRF Command Line Tools 10.24.2, seção macOS (.dmg) — não os arquivos Linux-arm64"
fi

if command -v JLinkExe >/dev/null 2>&1; then
  green "JLinkExe em $(command -v JLinkExe)"
else
  warn "JLinkExe não está no PATH (o nrfjprog pode funcionar mesmo assim)"
fi

if [ -L /Applications/SEGGER/JLink ]; then
  info "symlink SEGGER -> $(readlink /Applications/SEGGER/JLink)"
elif [ -d /Applications/SEGGER/JLink ]; then
  info "/Applications/SEGGER/JLink é diretório real (não symlink)"
fi

title "2. dotbot-provision e imagens de firmware"

if command -v dotbot-provision >/dev/null 2>&1; then
  green "dotbot-provision instalado"
else
  block "dotbot-provision não encontrado"
  info  "pipx install dotbot-provision"
fi

FW_DIR=""
for candidate in "$PWD/bin/$FW_VERSION" "$HOME/dotbot-fw/bin/$FW_VERSION" "$REPO_ROOT/bin/$FW_VERSION"; do
  [ -d "$candidate" ] && { FW_DIR="$candidate"; break; }
done

if [ -n "$FW_DIR" ]; then
  green "imagens em $FW_DIR"
  for asset in 03app_gateway_app-nrf5340-app.hex 03app_gateway_net-nrf5340-net.hex; do
    if [ -f "$FW_DIR/$asset" ]; then green "  $asset"; else block "  $asset ausente"; fi
  done
  ls "$FW_DIR"/config-*.hex >/dev/null 2>&1 && info "config-*.hex presente (net_id já gerado por um flash anterior)"
else
  block "pasta bin/$FW_VERSION não encontrada"
  info  "mkdir -p ~/dotbot-fw && cd ~/dotbot-fw && dotbot-provision fetch --fw-version $FW_VERSION"
  info  "(sem o 'v' na versão — 'v0.8.0' dá 404)"
fi

title "3. Sniffer da serial"

if command -v node >/dev/null 2>&1; then
  green "node $(node --version)"
else
  block "node não encontrado"
fi

if [ -f "$REPO_ROOT/Backend/server/node_modules/serialport/package.json" ]; then
  green "serialport instalado em Backend/server"
else
  block "serialport ausente — rode 'npm install' em Backend/server"
fi

[ -f "$REPO_ROOT/scripts/gateway/sniff.mjs" ] && green "sniff.mjs presente" || block "sniff.mjs ausente"

title "4. Placa (precisa do nRF5340DK plugado e ligado)"

USB_HIT=""
command -v system_profiler >/dev/null 2>&1 && \
  USB_HIT="$(system_profiler SPUSBDataType 2>/dev/null | grep -i -E 'segger|j-link' | head -1)"

if [ -n "$USB_HIT" ]; then
  green "placa vista no USB:$(printf '%s' "$USB_HIT" | sed 's/^ *//')"
else
  warn "nenhum dispositivo SEGGER/J-Link no USB"
  info "cabo NO CONECTOR DO J-LINK (o que NÃO se chama 'nRF USB'), cabo de DADOS,"
  info "switch de power ON, chave em DEFAULT (não 'nRF ONLY'), direto na porta do Mac"
fi

[ -d /Volumes/JLINK ] && green "disco JLINK montado" || info "disco JLINK não montado"

if command -v nrfjprog >/dev/null 2>&1; then
  IDS="$(nrfjprog --ids 2>/dev/null | grep -E '^[0-9]+' | tr '\n' ' ')"
  if [ -n "$IDS" ]; then green "sondas detectadas: $IDS"; else warn "nrfjprog --ids vazio"; fi
fi

PORTS="$(ls /dev/tty.usbmodem* 2>/dev/null | tr '\n' ' ')"
if [ -n "$PORTS" ]; then
  green "portas seriais: $PORTS"
  info "a do gateway é a PRIMEIRA (VCOM0)"
else
  info "nenhuma /dev/tty.usbmodem* (normal sem a placa)"
fi

title "Resumo"
if [ "$BLOCKERS" -eq 0 ] && [ -n "$USB_HIT" ]; then
  printf '  Tudo pronto. Próximo comando (de dentro de ~/dotbot-fw):\n'
  printf '    dotbot-provision flash --device gateway --fw-version %s --network-id 0100\n' "$FW_VERSION"
elif [ "$BLOCKERS" -eq 0 ]; then
  printf '  Software pronto. Falta só plugar a placa — veja a seção 4.\n'
else
  printf '  %d item(ns) bloqueando. Resolva os marcados como FALTA acima.\n' "$BLOCKERS"
fi
printf '\n'

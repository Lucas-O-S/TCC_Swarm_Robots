#!/usr/bin/env bash
# Prepara uma EC2 com Amazon Linux 2023 (do zero) para rodar o
# deploy/docker-compose.yml. Pode rodar de novo sem medo: cada passo pula o
# que já estiver feito. Passo a passo completo no deploy/README.md.
#
# Uso:  bash ~/tcc/back/deploy/setup-ec2.sh
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
step() { printf '\n==> %s\n' "$*"; }

if ! grep -q 'Amazon Linux' /etc/os-release; then
  echo "Este script é para Amazon Linux 2023 (a AMI padrão da EC2)." >&2
  exit 1
fi

step "Swap de 2 GB (o build do front/back passa da RAM de uma t3.small)"
if ! sudo swapon --show | grep -q '/swapfile'; then
  sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap defaults 0 0' | sudo tee -a /etc/fstab >/dev/null
fi
free -h | head -3

step "Docker, git e openssl"
sudo dnf install -y docker git openssl >/dev/null
sudo systemctl enable --now docker

step "Plugins Docker Compose e Buildx (o Amazon Linux não traz)"
PLUGINS=/usr/local/lib/docker/cli-plugins
sudo mkdir -p "$PLUGINS"
case "$(uname -m)" in
  x86_64)  GOARCH=amd64 ;;
  aarch64) GOARCH=arm64 ;;
  *) echo "Arquitetura $(uname -m) não suportada." >&2; exit 1 ;;
esac
if ! sudo docker compose version >/dev/null 2>&1; then
  sudo curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
    -o "$PLUGINS/docker-compose"
  sudo chmod +x "$PLUGINS/docker-compose"
fi
if ! sudo docker buildx version >/dev/null 2>&1; then
  # /releases/latest redireciona para /releases/tag/vX.Y.Z: pega a versão dali.
  BUILDX_VERSION=$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/docker/buildx/releases/latest | sed 's#.*/tag/##')
  sudo curl -fsSL "https://github.com/docker/buildx/releases/download/$BUILDX_VERSION/buildx-$BUILDX_VERSION.linux-$GOARCH" \
    -o "$PLUGINS/docker-buildx"
  sudo chmod +x "$PLUGINS/docker-buildx"
fi
sudo docker compose version
sudo docker buildx version

step "Tailscale (rede privada até a borda no seu Mac)"
if ! command -v tailscale >/dev/null; then
  sudo curl -fsSL https://pkgs.tailscale.com/stable/amazon-linux/2023/tailscale.repo \
    -o /etc/yum.repos.d/tailscale.repo
  sudo dnf install -y tailscale >/dev/null
fi
sudo systemctl enable --now tailscaled

step "Arquivo deploy/.env"
if [ -f "$DEPLOY_DIR/.env" ]; then
  echo "Já existe, não mexi: $DEPLOY_DIR/.env"
else
  # IP público da instância (serviço de metadados da EC2, IMDSv2).
  IMDS_TOKEN=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
  if ! PUBLIC_IP=$(curl -fsS -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4); then
    echo "A instância não tem IP público. Associe o IP elástico (README, passo 3) e rode de novo." >&2
    exit 1
  fi
  DOMAIN="${PUBLIC_IP//./-}.sslip.io"
  cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
  sed -i \
    -e "s#^DOMAIN=.*#DOMAIN=$DOMAIN#" \
    -e "s#^DB_PASSWORD=.*#DB_PASSWORD=$(openssl rand -hex 16)#" \
    -e "s#^JWT_SECRET=.*#JWT_SECRET=$(openssl rand -hex 32)#" \
    -e "s#^EDGE_TOKEN=.*#EDGE_TOKEN=$(openssl rand -hex 24)#" \
    "$DEPLOY_DIR/.env"
  chmod 600 "$DEPLOY_DIR/.env"
  echo "Criado: $DEPLOY_DIR/.env"
  echo "  DOMAIN=$DOMAIN   (confira: tem que ser o IP elástico $PUBLIC_IP)"
fi

cat <<MSG

Pronto. Próximos passos (README):
  1. sudo tailscale up --hostname tcc-aws --accept-dns=false   -> abra o link que aparecer e entre na mesma conta do Mac
  2. nano $DEPLOY_DIR/.env          -> EDGE_URL com o IP 100.x do Mac; copie o EDGE_TOKEN pro Mac
  3. cd $DEPLOY_DIR && sudo docker compose up -d --build
MSG

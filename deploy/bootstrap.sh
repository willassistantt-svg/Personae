#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl git
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER"
fi

sudo mkdir -p /opt/personae
sudo chown "$USER:$USER" /opt/personae
if [ ! -d /opt/personae/.git ]; then
  git clone https://github.com/willassistantt-svg/Personae.git /opt/personae
fi

if [ ! -f /opt/personae/.env ]; then
  cp /opt/personae/.env.example /opt/personae/.env
  echo "Criei /opt/personae/.env a partir do exemplo. Troque senhas, JWT_SECRET, PUBLIC_URL, COOKIE_SECURE e a chave do Resend antes do primeiro deploy."
  exit 1
fi

echo "Repositório pronto em /opt/personae. O deploy do GitHub usa deploy/remote-up.sh."

#!/usr/bin/env bash
# Provisions a fresh Ubuntu VPS for Personae. Safe to run again.
# Usage (as a sudo user): DEPLOY_PUBKEY="ssh-ed25519 AAAA... github-actions" bash deploy/bootstrap.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/personae}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
REPO_URL="${REPO_URL:-https://github.com/willassistantt-svg/Personae.git}"

export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -y
sudo apt-get -o Dpkg::Options::=--force-confold upgrade -y
sudo apt-get install -y ca-certificates curl git gnupg ufw fail2ban unattended-upgrades

if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
sudo systemctl enable --now docker

# Gradle and Next.js builds need more than 4 GB at peak.
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-personae.conf >/dev/null
  sudo sysctl --system >/dev/null
fi

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

sudo tee /etc/fail2ban/jail.d/personae.conf >/dev/null <<'EOF'
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
EOF
sudo systemctl enable --now fail2ban
sudo systemctl restart fail2ban

echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades >/dev/null

if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  sudo adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
sudo usermod -aG docker "$DEPLOY_USER"
sudo install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
if [ -n "${DEPLOY_PUBKEY:-}" ]; then
  echo "$DEPLOY_PUBKEY" | sudo tee "/home/$DEPLOY_USER/.ssh/authorized_keys" >/dev/null
  sudo chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
  sudo chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi

sudo mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo git clone "$REPO_URL" "$APP_DIR"
fi
sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
sudo usermod -aG "$DEPLOY_USER" "$(id -un)"

# Only key logins. Loaded before cloud-init's file, and sshd keeps the first value it reads.
sudo tee /etc/ssh/sshd_config.d/00-personae.conf >/dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
sudo sshd -t
if systemctl is-active --quiet ssh; then
  sudo systemctl reload ssh
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo "Falta $APP_DIR/.env. Crie o arquivo a partir de .env.example antes do primeiro deploy."
  exit 1
fi
echo "VPS pronta em $APP_DIR. O deploy do GitHub roda deploy/remote-up.sh como $DEPLOY_USER."

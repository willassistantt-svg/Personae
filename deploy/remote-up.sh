#!/usr/bin/env bash
set -euo pipefail

cd "${VPS_PATH:-/opt/personae}"

if [ ! -f .env ]; then
  echo "Falta /opt/personae/.env. Rode deploy/bootstrap.sh e preencha o arquivo."
  exit 1
fi

env_value() {
  local line
  line="$(grep -E "^${1}=" .env | tail -n 1 || true)"
  line="${line#*=}"
  line="${line%\"}"
  line="${line#\"}"
  printf '%s' "$line"
}

jwt="$(env_value JWT_SECRET)"
seed="$(env_value SEED_ENABLED)"
secure="$(env_value COOKIE_SECURE)"
resend="$(env_value RESEND_API_KEY)"

if [ "$jwt" = "personae-dev-secret-change-me-please-32b" ] || [ -z "$jwt" ]; then
  echo "Troque JWT_SECRET no .env da VPS antes de publicar."
  exit 1
fi
if [ "${seed:-true}" = "true" ]; then
  echo "SEED_ENABLED precisa ser false em produção."
  exit 1
fi
if [ "$secure" != "true" ]; then
  echo "COOKIE_SECURE precisa ser true em produção."
  exit 1
fi
if [ -z "$resend" ]; then
  echo "RESEND_API_KEY está vazio. O site sobe, mas os e-mails não saem."
fi

git fetch origin main
git checkout main
git pull --ff-only origin main
docker compose up --build -d
docker compose ps
curl -fsS http://127.0.0.1/api/health
echo

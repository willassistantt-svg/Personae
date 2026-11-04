#!/usr/bin/env bash
# Runs on the VPS (as the deploy user). Publishes DEPLOY_SHA (default: origin/main) and rolls
# back to the previous commit when the new build does not become healthy.
set -euo pipefail

cd "${VPS_PATH:-/opt/personae}"

if [ ! -f .env ]; then
  echo "Falta $(pwd)/.env. Rode deploy/bootstrap.sh e preencha o arquivo."
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

if [ "$jwt" = "personae-dev-secret-change-me-please-32b" ] || [ ${#jwt} -lt 32 ]; then
  echo "Troque JWT_SECRET no .env da VPS (32 caracteres ou mais) antes de publicar."
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
  echo "Aviso: RESEND_API_KEY está vazio. O site sobe, mas os e-mails não saem."
fi

wait_healthy() {
  for _ in $(seq 1 60); do
    if curl -fsS --max-time 5 http://127.0.0.1/api/health >/dev/null 2>&1 \
      && curl -fsS --max-time 5 -o /dev/null http://127.0.0.1/; then
      return 0
    fi
    sleep 5
  done
  return 1
}

previous="$(git rev-parse HEAD)"
git fetch --quiet origin main
target="${DEPLOY_SHA:-$(git rev-parse origin/main)}"
echo "Publicando ${target:0:7} (antes: ${previous:0:7})"
git checkout --quiet --detach "$target"

if docker compose up --build -d --remove-orphans && wait_healthy; then
  git checkout --quiet -B main "$target"
  docker image prune -f >/dev/null
  docker compose ps
  echo "Saúde: $(curl -fsS http://127.0.0.1/api/health)"
  echo "Publicado ${target:0:7}."
  exit 0
fi

echo "A versão ${target:0:7} não ficou saudável. Logs recentes:"
docker compose logs --tail 80 api frontend nginx || true
if [ "$previous" != "$target" ]; then
  echo "Voltando para ${previous:0:7}..."
  git checkout --quiet -B main "$previous"
  docker compose up --build -d --remove-orphans
  if wait_healthy; then
    echo "Rollback concluído: ${previous:0:7} está no ar."
  else
    echo "O rollback também não ficou saudável. Verifique a VPS."
  fi
fi
exit 1

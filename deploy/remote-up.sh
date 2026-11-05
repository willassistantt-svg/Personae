#!/usr/bin/env bash
# Runs on the VPS (as the deploy user). Publishes DEPLOY_SHA (default: origin/main) using the images
# GitHub Actions pushed to GHCR, and rolls back to the previous release when the new one is unhealthy.
# Optional: REGISTRY_USER / REGISTRY_TOKEN to log in to ghcr.io (the workflow passes them on stdin).
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

set_env() {
  if grep -qE "^${1}=" .env; then
    sed -i "s|^${1}=.*|${1}=${2}|" .env
  else
    printf '%s=%s\n' "$1" "$2" >> .env
  fi
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
    sleep 3
  done
  return 1
}

# The config files are bind-mounted one by one: git replaces them with new files, so a running nginx keeps
# serving the old copy until the container is recreated.
refresh_nginx() {
  local wanted running
  wanted="$(cat nginx/nginx.prod.conf nginx/cloudflare.conf | sha256sum)"
  # </dev/null: this script arrives on stdin, and exec would swallow the rest of it.
  running="$(docker compose exec -T nginx cat /etc/nginx/nginx.conf /etc/nginx/cloudflare.conf </dev/null 2>/dev/null | sha256sum || true)"
  if [ "$wanted" != "$running" ]; then
    echo "Configuração do Nginx mudou; recriando o container."
    docker compose up -d --no-build --no-deps --force-recreate nginx
  fi
}

# Pulls the images for a tag; builds them here only when the registry does not have them.
start_release() {
  export IMAGE_TAG="$1"
  if docker compose pull --quiet api frontend; then
    docker compose up -d --no-build --remove-orphans
  else
    echo "Imagens $IMAGE_TAG indisponíveis no registro; compilando na VPS (mais lento)."
    docker compose up -d --build --remove-orphans
  fi
  refresh_nginx
}

if [ -n "${REGISTRY_TOKEN:-}" ]; then
  printf '%s' "$REGISTRY_TOKEN" | docker login ghcr.io -u "${REGISTRY_USER:-deploy}" --password-stdin >/dev/null
  trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT
fi

previous="$(git rev-parse HEAD)"
previous_tag="$(env_value IMAGE_TAG)"
git fetch --quiet origin main
target="${DEPLOY_SHA:-$(git rev-parse origin/main)}"
echo "Publicando ${target:0:7} (antes: ${previous:0:7})"
git checkout --quiet --detach "$target"

started=$(date +%s)
if start_release "$target" && wait_healthy; then
  git checkout --quiet -B main "$target"
  set_env IMAGE_TAG "$target"
  docker image prune -af --filter "until=168h" >/dev/null || true
  docker builder prune -af --filter "until=168h" >/dev/null || true
  docker compose ps
  echo "Saúde: $(curl -fsS http://127.0.0.1/api/health)"
  echo "Publicado ${target:0:7} em $(( $(date +%s) - started ))s."
  exit 0
fi

echo "A versão ${target:0:7} não ficou saudável. Logs recentes:"
docker compose logs --tail 80 api frontend nginx || true
if [ "$previous" != "$target" ]; then
  echo "Voltando para ${previous:0:7}..."
  git checkout --quiet -B main "$previous"
  if start_release "${previous_tag:-$previous}" && wait_healthy; then
    echo "Rollback concluído: ${previous:0:7} está no ar."
  else
    echo "O rollback também não ficou saudável. Verifique a VPS."
  fi
fi
exit 1

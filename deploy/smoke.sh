#!/usr/bin/env bash
# End-to-end check of a running Personae stack.
# Usage: deploy/smoke.sh <base-url> [admin-email admin-password]
# Without credentials it only checks public routes (used against production).
set -euo pipefail

BASE="${1:?base url, e.g. http://localhost}"
EMAIL="${2:-}"
PASSWORD="${3:-}"
ATTEMPTS="${SMOKE_ATTEMPTS:-30}"
jar="$(mktemp)"
trap 'rm -f "$jar"' EXIT

fail() {
  echo "FALHOU: $*"
  exit 1
}

status_of() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$@"
}

echo "Esperando $BASE/api/health..."
for i in $(seq 1 "$ATTEMPTS"); do
  body="$(curl -fsS --max-time 10 "$BASE/api/health" 2>/dev/null || true)"
  if echo "$body" | grep -q '"database":"UP"'; then
    break
  fi
  [ "$i" = "$ATTEMPTS" ] && fail "API sem saúde em $BASE/api/health (resposta: ${body:-vazia})"
  sleep 5
done
echo "ok  API e banco: $body"

code="$(status_of "$BASE/")"
[ "$code" = "200" ] || fail "página inicial respondeu $code"
echo "ok  página inicial (200)"

code="$(status_of "$BASE/api/public/house")"
[ "$code" = "200" ] || fail "/api/public/house respondeu $code"
echo "ok  dados públicos da casa (200)"

code="$(status_of "$BASE/api/auth/me")"
[ "$code" = "401" ] || fail "/api/auth/me sem sessão deveria ser 401 e foi $code"
echo "ok  rotas protegidas exigem login (401)"

if [ -n "$EMAIL" ]; then
  payload="$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PASSWORD")"
  code="$(status_of -c "$jar" -H 'Content-Type: application/json' -d "$payload" "$BASE/api/auth/login")"
  [ "$code" = "200" ] || fail "login do admin respondeu $code"
  echo "ok  login do admin (200)"

  code="$(status_of -b "$jar" "$BASE/api/auth/me")"
  [ "$code" = "200" ] || fail "/api/auth/me com sessão respondeu $code"
  echo "ok  sessão ativa (200)"

  profiles="$(curl -fsS -b "$jar" --max-time 20 "$BASE/api/admin/profiles")" || fail "lista de personas do admin falhou"
  echo "$profiles" | grep -q '"id"' || fail "lista de personas veio vazia"
  echo "ok  catálogo do admin"

  catalog="$(status_of -b "$jar" "$BASE/catalog")"
  [ "$catalog" = "200" ] || fail "/catalog respondeu $catalog"
  echo "ok  página do catálogo (200)"
fi

echo "Tudo certo em $BASE."

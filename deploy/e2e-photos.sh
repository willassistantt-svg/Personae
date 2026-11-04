#!/usr/bin/env bash
# Photo flow against a disposable stack (CI only: it creates and removes a persona).
# Usage: deploy/e2e-photos.sh <base-url> <admin-email> <admin-password>
set -euo pipefail

BASE="${1:?base url}"
EMAIL="${2:?admin email}"
PASSWORD="${3:?admin password}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
jar="$work/jar"

fail() {
  echo "FALHOU: $*"
  exit 1
}

photo_ids() {
  python3 -c 'import json,sys; print(" ".join(p["id"] for p in json.load(sys.stdin)["photos"]))'
}

if command -v magick >/dev/null; then im=magick; else im=convert; fi
for color in red green blue; do
  "$im" -size 2400x3200 "xc:$color" "$work/$color.jpg"
done

payload="$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PASSWORD")"
curl -fsS -c "$jar" -H 'Content-Type: application/json' -d "$payload" "$BASE/api/auth/login" >/dev/null || fail "login"

created="$(curl -fsS -b "$jar" -X POST "$BASE/api/admin/profiles" \
  -F name='E2E Ordem' -F age=25 -F city='Teste' \
  -F photos=@"$work/red.jpg" -F photos=@"$work/green.jpg")" || fail "criar persona"
id="$(echo "$created" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
read -r red green <<<"$(echo "$created" | photo_ids)"
[ -n "$green" ] || fail "persona criada sem as duas fotos"
echo "ok  persona criada com 2 fotos"

updated="$(curl -fsS -b "$jar" -X PUT "$BASE/api/admin/profiles/$id" \
  -F name='E2E Ordem' -F age=25 -F city='Teste' \
  -F photos=@"$work/blue.jpg" \
  -F photoOrder="$green" -F photoOrder='new:0' -F photoOrder="$red")" || fail "salvar com foto nova no meio"
read -r first blue last <<<"$(echo "$updated" | photo_ids)"
[ "$first" = "$green" ] && [ "$last" = "$red" ] && [ -n "$blue" ] && [ "$blue" != "$red" ] && [ "$blue" != "$green" ] \
  || fail "ordem depois de salvar: $(echo "$updated" | photo_ids)"
echo "ok  foto nova salva na posição escolhida"

reordered="$(curl -fsS -b "$jar" -X PUT -H 'Content-Type: application/json' \
  -d "{\"ids\":[\"$blue\",\"$red\",\"$green\"]}" "$BASE/api/admin/profiles/$id/photos/order")" || fail "reordenar"
[ "$(echo "$reordered" | photo_ids)" = "$blue $red $green" ] || fail "ordem depois de reordenar: $(echo "$reordered" | photo_ids)"
echo "ok  reordenação"

left="$(curl -fsS -b "$jar" -X DELETE "$BASE/api/admin/profiles/$id/media/$red")" || fail "remover foto"
[ "$(echo "$left" | photo_ids)" = "$blue $green" ] || fail "fotos depois de remover: $(echo "$left" | photo_ids)"
echo "ok  remoção de foto"

code="$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" "$BASE/api/media/$blue")"
[ "$code" = "200" ] || fail "foto nova não abre ($code)"
echo "ok  foto nova servida (200)"

curl -fsS -b "$jar" -X DELETE "$BASE/api/admin/profiles/$id" >/dev/null || fail "remover persona"
echo "ok  persona de teste removida"

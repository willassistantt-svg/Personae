# Infraestrutura do Personae

## VPS

- Ubuntu 26.04, 2 vCPU, 4 GB RAM + 4 GB swap, IP `151.247.210.86`.
- Provisionada por `deploy/bootstrap.sh` (idempotente): Docker, UFW (22, 80, 443), fail2ban, atualizações automáticas, SSH só por chave, usuário `deploy` (grupo docker) dono de `/opt/personae`.
- `/opt/personae/.env` (600, dono `deploy`) define `COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml`, `HTTP_PORT=127.0.0.1:80`, `SEED_ENABLED=false`, `COOKIE_SECURE=true` e os segredos. Nunca vai para o Git.
- Certificado de origem do Cloudflare em `/etc/personae/tls/origin.pem` + `origin.key` (válido até 2041).

## Rede

- Cloudflare proxied: `personae.men` (A → VPS) e `www` (CNAME). SSL **Full (strict)**, Always HTTPS, TLS 1.2+.
- Nginx de produção (`nginx/nginx.prod.conf`): 443 com o certificado de origem e **só aceita IPs do Cloudflare** (`nginx/cloudflare.conf`); a porta 80 fica só em `127.0.0.1` para o health check do deploy.
- Se o Cloudflare publicar novas faixas de IP, atualizar `nginx/cloudflare.conf` (https://www.cloudflare.com/ips/).

## GitHub Actions — secrets

`VPS_HOST`, `VPS_USER` (`deploy`), `VPS_PORT` (`22`), `VPS_PATH` (`/opt/personae`), `VPS_SSH_KEY` (chave privada `personae_deploy`), `VPS_KNOWN_HOSTS` (host key ed25519 da VPS).

Trocar a chave de deploy: gerar novo par, colocar a pública em `/home/deploy/.ssh/authorized_keys` e atualizar `VPS_SSH_KEY` com `gh secret set VPS_SSH_KEY -R willassistantt-svg/Personae < arquivo`.

## Monitor (Cloudflare Worker)

- Código em `monitor/`, nome `personae-status`, cron a cada minuto, banco D1 `personae-monitor`, domínio `status.personae.men`.
- Checa `GET /api/health` (exige `"database":"UP"`) e `GET /`. Alerta por e-mail (Resend, chave `personae-monitor`) depois de 2 falhas seguidas e quando volta.
- Alterar destinatários: variável `ALERT_TO` (separar por vírgula) no Worker.
- Redeploy: `cd monitor && npx wrangler deploy` (com `wrangler login` na conta Cloudflare do projeto).

## Primeiro acesso em produção

`SEED_ENABLED=false` não cria dados de demonstração. O `HouseBootstrap` cria as configurações da casa e a conta do diretor a partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env` da VPS, só se ela ainda não existir.

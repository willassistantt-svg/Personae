# The Personae

Casa privada para membros aceitos. O catálogo reúne várias personas, com fotografias, um vídeo curto e contato. O acesso só abre depois da análise da direção.

Domínio: [personae.men](https://personae.men). A interface está em português e inglês.

## O que a casa faz

- Pedido de cadastro com selfie segurando um documento, e uma tela que pede para aguardar o aceite.
- E-mail de recebimento e, depois do aceite, e-mail com o link para criar a senha. Sem a chave do Resend, o link continua disponível para copiar e enviar à mão.
- Catálogo fechado, visível só depois do login, e a ficha de cada persona.
- Direção: painel, análise dos cadastros, entrada direta, ativar, desativar ou remover, links de senha, e o catálogo (criar, editar, ocultar, remover).

## Arquitetura

O navegador fala com o Nginx. `/` vai para o Next.js (Pages Router) e `/api` vai para a API Spring Boot. O banco é PostgreSQL 16, com migrações Flyway. A sessão é um JWT em cookie HttpOnly. Papéis: `ADMIN` e `USER`.

No frontend, a leitura passa por páginas, containers, hooks, components e `lib`. No backend, por controller, service, repository e domain.

## Rodar aqui

Pré-requisitos: Node 22, Java 21, PostgreSQL 16.

```bash
# banco
sudo -u postgres psql -c "CREATE ROLE personae LOGIN PASSWORD 'personae';"
sudo -u postgres createdb -O personae personae

# API, na porta 8091
cd backend
./gradlew bootRun

# site, na porta 4317
cd frontend
npm install
npm run dev
```

Abra [http://127.0.0.1:4317](http://127.0.0.1:4317).

Contas de demonstração, para trocar antes de qualquer publicação:

| Quem | E-mail | Senha |
|---|---|---|
| Direção | iris.p@example.org | PersonaeAdmin#2026 |
| Membro | member@thepersonae.com | MemberAccess#2026 |
| Aguardando senha | invited@thepersonae.com | link `/set-password?token=demo-invite-token` |
| Em análise | pending@thepersonae.com | ainda sem senha |

## E-mail

O envio usa a API do Resend. Defina `RESEND_API_KEY` e `RESEND_FROM`. Sem a chave, o cadastro e o aceite continuam válidos e a direção copia o link na ficha do membro.

## Docker Desktop

Na pasta do projeto, com o Docker Desktop aberto:

```bash
docker compose up --build -d
```

O site fica em [http://localhost](http://localhost). O Nginx recebe a porta 80 e entrega `/` ao Next.js e `/api` à API. Postgres, fotos e vídeos ficam nos volumes `pgdata` e `uploads`. Sem arquivo `.env`, o Compose usa os padrões de desenvolvimento (HTTP, cookie sem a flag Secure).

Para parar: `docker compose down`. Os volumes permanecem. `docker compose down -v` apaga o banco e as fotos.

## Produção

`https://personae.men` roda numa VPS com o mesmo Compose mais `docker-compose.prod.yml`: o Nginx atende HTTPS com o certificado de origem do Cloudflare (SSL Full strict) e só aceita conexões vindas do Cloudflare.

- **Provisionar uma VPS nova:** `DEPLOY_PUBKEY="<chave pública do deploy>" bash deploy/bootstrap.sh` e crie `/opt/personae/.env` a partir do bloco de VPS do `.env.example` (`SEED_ENABLED=false`, `COOKIE_SECURE=true`, `JWT_SECRET` longo).
- **Entregar mudanças:** abra um PR para `main`. A CI (`.github/workflows/ci.yml`) roda testes, builds e um smoke test da stack inteira em Docker. O merge na `main` dispara `.github/workflows/deploy.yml`, que publica na VPS, faz rollback sozinho se a versão nova não ficar saudável e testa `https://personae.men` no fim. No Cursor, a skill `deploy-personae` faz esse fluxo do commit ao merge.
- **Saúde:** `GET /api/health` responde `{"status":"UP","database":"UP"}` e 503 quando o banco cai. O painel `https://status.personae.men` (Worker em `monitor/`) checa a cada minuto e manda e-mail quando o site cai e quando volta.

Detalhes da infraestrutura: `.cursor/skills/deploy-personae/reference.md`.

## Testes

```bash
cd frontend && npm test && npm run typecheck
cd backend && ./gradlew test
```

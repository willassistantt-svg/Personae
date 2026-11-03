# The Personae

Casa privada para membros aceitos. O catálogo reúne várias personas, com fotografias, um filme curto e contato. O acesso só abre depois da análise da direção.

Domínio previsto: [thepersonae.com](https://thepersonae.com). A interface está em português e inglês.

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

## Docker

```bash
docker compose up --build
```

O Nginx publica a porta 80. Postgres, API, frontend e Nginx sobem juntos. As fotos enviadas ficam no volume `uploads`.

## Produção

VPS com Docker Compose, domínio `thepersonae.com` atrás do Cloudflare (proxy laranja, SSL completo). O pipeline em `.github/workflows/ci.yml` roda os testes do frontend e do backend. Saúde da API: `GET /api/health` e `GET /actuator/health`. Aponte um monitor externo para `https://thepersonae.com/api/health`.

Antes de publicar, troque `JWT_SECRET`, `ADMIN_PASSWORD` e `COOKIE_SECURE=true`. O arquivo `.env.example` lista as variáveis.

## Testes

```bash
cd frontend && npm test && npm run typecheck
cd backend && ./gradlew test
```

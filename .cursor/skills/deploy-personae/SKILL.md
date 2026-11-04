---
name: deploy-personae
description: Ships Personae changes to production through GitHub - branch, commit, push, pull request (MR), wait for the CI pipeline, auto-merge when green, watch the deploy to the VPS and verify https://personae.men. Use when the user asks to deploy, publish, ship, "subir", "publicar", "fazer deploy", open an MR/PR and merge, or check whether production is healthy.
---

# Deploy do Personae

Repositório: `willassistantt-svg/Personae` (GitHub). Produção: `https://personae.men` numa VPS atrás do Cloudflare.

## Como o pipeline funciona

- **CI** (`.github/workflows/ci.yml`) roda em todo PR para `main`: backend (`gradlew test bootJar`), frontend (`typecheck`, `test`, `build`) e **e2e** (sobe a stack inteira com Docker e roda `deploy/smoke.sh` com login do admin de demonstração).
- **Deploy** (`.github/workflows/deploy.yml`) roda em todo push na `main`: repete a CI, entra por SSH na VPS como `deploy`, roda `deploy/remote-up.sh` com o commit exato (`DEPLOY_SHA`), espera a saúde e **faz rollback sozinho** se a versão nova não subir. Depois o job **Verificar produção** roda o smoke test contra `https://personae.men`.
- Monitor independente: `https://status.personae.men` (Worker em `monitor/`) checa a cada minuto e manda e-mail quando cai e quando volta.

## Fluxo de entrega

Copie e acompanhe:

```
- [ ] 1. Conferir mudanças e criar branch
- [ ] 2. Commit
- [ ] 3. Push e abrir o PR
- [ ] 4. Esperar a CI (corrigir se quebrar)
- [ ] 5. Merge automático
- [ ] 6. Acompanhar o deploy
- [ ] 7. Verificar produção e voltar para a main
```

**1. Conferir mudanças e criar branch**

```bash
git status --short
git diff --stat
git switch -c <tipo>/<resumo-curto>   # ex.: feat/ordenar-fotos, fix/menu-sair
```

Nunca commitar `.env`, chaves ou senhas. Se já estiver numa branch que não é `main`, continue nela.

**2. Commit** — no estilo do repositório: português, frase imperativa curta, terminando com ponto. Agrupe por assunto (um commit por mudança lógica).

```bash
git add <arquivos>
git commit -m "Permite ordenar e remover fotos direto no editar."
```

**3. Push e abrir o PR**

```bash
git push -u origin HEAD
gh pr create --base main --title "<título>" --body "<o que muda e por quê; como foi testado>"
```

Se já existe PR para a branch, só faça push. Anote o número do PR.

**4. Esperar a CI**

```bash
gh pr checks <numero> --watch --fail-fast
```

Leva ~10–15 min (o job e2e builda as imagens Docker). Se falhar:

```bash
gh run list --branch <branch> --limit 3
gh run view <run-id> --log-failed
```

Corrija, faça commit e push na mesma branch e volte ao passo 4. Não faça merge com check vermelho.

**5. Merge automático** (só com todos os checks verdes)

```bash
gh pr merge <numero> --squash --delete-branch
```

**6. Acompanhar o deploy**

```bash
gh run list --workflow deploy.yml --branch main --limit 1
gh run watch <run-id> --exit-status
```

O run passa por: CI → Publicar na VPS → Verificar produção (~15–20 min no total). Se falhar em "Publicar na VPS", o `remote-up.sh` já voltou a versão anterior; leia o log com `gh run view <run-id> --log-failed`, corrija e repita o fluxo com um novo PR.

**7. Verificar produção e voltar para a main**

```bash
curl -fsS https://personae.men/api/health      # {"status":"UP","database":"UP"}
git switch main && git pull --ff-only
```

Informe ao usuário: link do PR, resultado da CI, resultado do deploy e a saúde de produção.

## Comandos úteis

| Situação | Comando |
|---|---|
| Rodar o deploy de novo sem mudar código | `gh workflow run deploy.yml --ref main` |
| Rodar só a CI numa branch | `gh workflow run ci.yml --ref <branch>` |
| Desfazer um merge que quebrou | `git revert -m 1 <sha-do-merge>` numa branch nova + PR por este fluxo |
| Ver containers e logs na VPS | `ssh personae-vps "cd /opt/personae && docker compose ps && docker compose logs --tail 100 api"` |

O alias `personae-vps` (usuário `ubuntu`, chave `~/.ssh/personae_vps`) existe só na máquina do Lucas. Detalhes da infraestrutura em [reference.md](reference.md).

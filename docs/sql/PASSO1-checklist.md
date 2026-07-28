# Passo 1 — Checklist de pre-requisitos

Runbook: [../tutorial-migracao-sqlserver-2008r2.md](../tutorial-migracao-sqlserver-2008r2.md)  
DDL versionado: [fx_obras_schema_2008r2.sql](./fx_obras_schema_2008r2.sql)  
Backup SQL Server: [../sqlserver-backup-pre-migration.sql](../sqlserver-backup-pre-migration.sql)

## Decisoes confirmadas

| Item | Decisao |
|---|---|
| Quem executa o DDL no SQL Server | **Voce** (no servidor) |
| Usuario do script `fx_obras_app` | Ajuste se for usar outro login (ex.: `UserService`); ver secao abaixo |
| SQLite para teste local | Voce busca o `.db` do servidor e traz para esta maquina |

## Ja feito neste Passo 1 (local)

- [x] Branch `feature/sqlserver-2008r2-cutover`
- [x] Backup local em `backups/20260728-100825-passo1/`
- [x] Script DDL versionado em `docs/sql/fx_obras_schema_2008r2.sql`

## SQLite de migracao (atualizado)

- Fonte do servidor colocada em `apps/api/prisma/prod.db`
- Copia de trabalho: `apps/api/prisma/dev.db` (`DATABASE_URL="file:./dev.db"`)
- Backup: `backups/20260728-104704-prod-db/sqlite/prod.db`

Contagens atuais:

| Tabela | Qtd |
|---|---|
| ConstructionOpportunity | 112 (32 deletadas) |
| ConstructionOpportunityPhoto | 256 (todas com thumbnail) |
| ConstructionOpportunityHistory | 605 |
| ServiceProvider | 1 |
| OpportunityServiceProvider | 0 |

## Passo 1b — Voce no servidor (SQL Server)

1. Backup do database alvo (`docs/sqlserver-backup-pre-migration.sql`; troque `SEU_BANCO`).
2. Abra `docs/sql/fx_obras_schema_2008r2.sql` e substitua **todas** as ocorrencias de `[SEU_BANCO]` pelo `DB_DATABASE` real (ex.: `Flex`).
3. **Usuario:**
   - Se for criar `fx_obras_app`: o LOGIN server-level precisa existir antes do `CREATE USER`.
   - Se for reutilizar o login atual da API (ex.: `UserService`): comente o bloco `CREATE USER` / `ALTER ROLE db_owner` / `ALTER USER ... DEFAULT_SCHEMA` e rode so schema + tabelas + indices.
   - **Nao** altere `DEFAULT_SCHEMA` do `UserService` (quebra objetos do Flex em `dbo`). A API e o ETL usam prefixo `fx_obras.` nas queries.
4. Execute o script no SSMS / sqlcmd.
5. Confirme a query final: **5 tabelas** no schema `fx_obras`.
6. Anote a collation retornada pelo script.

## Extrair o SQLite (e uploads) do Docker no servidor

No host onde roda o `docker-compose` do fx-obras:

```bash
# 1) Copiar o banco SQLite de producao/homolog do volume
docker cp fx-obras-backend:/app/data/prod.db ./prod.db

# 2) (Recomendado) copiar uploads tambem
mkdir -p ./uploads-from-server
docker cp fx-obras-backend:/app/uploads/. ./uploads-from-server/
```

Se o arquivo nao estiver em `/app/data/prod.db`, inspecione:

```bash
docker exec fx-obras-backend ls -la /app/data
docker exec fx-obras-backend printenv DATABASE_URL
```

Traga para esta maquina e coloque em:

- `apps/api/prisma/dev.db` (para a API local com `DATABASE_URL="file:./dev.db"`), **e**
- uma copia em `backups/<timestamp>/sqlite/prod.db` (backup).

Uploads (se trouxer):

- conteudo em `apps/api/uploads/` (respeitando `UPLOAD_DIR=uploads/construction-opportunities`), **e**
- copia em `backups/<timestamp>/uploads/`.

## Quando voltar com o `.db`

Avise no chat. Proximos movimentos:

1. Validar o SQLite local (Prisma / listagem).
2. Confirmar se o schema `fx_obras` ja existe no SQL Server (Passo 1b ok).
3. **Passo 2 (Fase C):** corrigir lacunas do Sequelize antes de ligar `SQL_DIALECT=mssql`.

---

## Status atualizado

- [x] SQLite `prod.db` validado localmente (ver secao acima)
- [x] Passo 1b — schema SQL Server executado por voce
- [x] Passo 2 — lacunas Sequelize corrigidas ([PASSO2-sequelize-fixes.md](./PASSO2-sequelize-fixes.md))
- [x] Passo 3 — ETL + smoke mssql ([PASSO3-etl.md](./PASSO3-etl.md)) — homolog FlexDev OK
- [x] Circuit breaker sqlite<->mssql ([circuit-breaker-dialect.md](./circuit-breaker-dialect.md))
- [ ] Producao — seguir [PASSO-PRODUCAO-cutover.md](./PASSO-PRODUCAO-cutover.md)

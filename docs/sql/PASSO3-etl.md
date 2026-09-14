# Passo 3 — ETL SQLite -> SQL Server + smoke

## Pre-requisitos

1. Schema `fx_obras` ja criado no SQL Server ([fx_obras_schema_2008r2.sql](./fx_obras_schema_2008r2.sql)).
2. `apps/api/prisma/dev.db` (ou `prod.db`) com os dados de origem.
3. Arquivo `apps/api/.env` com conexao SQL Server, por exemplo:

```env
DATABASE_URL="file:./dev.db"
SQL_DIALECT=sqlite

DB_HOST=SEU_SERVIDOR
DB_PORT=1433
DB_DATABASE=SEU_BANCO
DB_USER=UserService
DB_PASSWORD=sua_senha
# ou DB_PASSWORD_B64=...

DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
SQLSERVER_ENCRYPT=false
SQLSERVER_TRUST_SERVER_CERTIFICATE=true
```

`DATABASE_URL` e opcional no dry-run: o script usa `prisma/dev.db` por padrao se a var nao existir.

O ETL e a API usam sempre o prefixo `fx_obras.` (override via `FX_OBRAS_SCHEMA`).
**Nao** altere `DEFAULT_SCHEMA` do `UserService` (quebra o Flex/ERP).

Validacao no SSMS:

```sql
USE FlexDev; -- ou o DB_DATABASE do .env
SELECT s.name, t.name
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = 'fx_obras'
ORDER BY t.name;
```

Devem aparecer as 5 tabelas. Se estiver vazio, reexecute [fx_obras_schema_2008r2.sql](./fx_obras_schema_2008r2.sql) com `USE [FlexDev]`.

## Contagens esperadas (prod.db atual)

| Tabela | Qtd |
|---|---|
| ConstructionOpportunity | 112 |
| ConstructionOpportunityPhoto | 256 |
| ConstructionOpportunityHistory | 605 |
| ServiceProvider | 1 |
| OpportunityServiceProvider | 0 |

## Comandos

Na pasta `apps/api`:

```bash
# 1) Validar leitura do SQLite (sem escrever no SQL Server)
npm run db:migrate-sqlite-to-mssql -- --dry-run

# 2) Carga real (apaga destino e reinsere)
npm run db:migrate-sqlite-to-mssql -- --truncate
```

Script: `apps/api/src/scripts/migrate-sqlite-to-mssql.ts`

Sem `--truncate`, a segunda execucao falha por PK duplicada. Use `--truncate` em homologacao.

## Smoke apos a carga

1. No `.env`, defina `SQL_DIALECT=mssql`.
2. Suba a API: `npm run dev -w @obras-prospect/api`
3. Teste:
   - `GET /api/v2/construction-opportunities` (deve listar obras)
   - login ERP Flex (auth continua no SQL Server)
4. Conferir no SSMS:

```sql
SELECT COUNT(1) FROM ConstructionOpportunity;
SELECT COUNT(1) FROM ConstructionOpportunityPhoto;
SELECT COUNT(1) FROM ConstructionOpportunityHistory;
SELECT COUNT(1) FROM ServiceProvider;
SELECT COUNT(1) FROM OpportunityServiceProvider;
```

## Uploads

O ETL **nao** copia arquivos. Fotos/audio precisam do volume `UPLOAD_DIR` sincronizado do servidor (`docker cp` / copia de `fx-obras-uploads`). Sem os arquivos, a listagem de dados funciona, mas imagens quebram.

No servidor (mesmo host do `prod.db`):

```bash
# Copiar o volume de uploads do container
docker cp fx-obras-backend:/app/uploads/. ./uploads-from-server/

# Trazer para a maquina local e colocar em:
#   apps/api/uploads/
# Estrutura esperada:
#   apps/api/uploads/construction-opportunities/<uuid>.jpg
#   apps/api/uploads/construction-opportunities/thumbs/<uuid>.jpg.webp
#   apps/api/uploads/construction-opportunities/audio/<opportunityId>/...
```

A API serve `express.static` em `/uploads` a partir de `apps/api/uploads` (cwd da API).
O front monta URL com `uploadsBaseUrl + '/' + relativePath`
(ex.: `uploads/construction-opportunities/....jpg`).

**Importante:** o snapshot antigo em `backups/20260721-133514/api-uploads` **nao** corresponde ao `prod.db` atual (0 arquivos em comum). Use o volume do servidor de onde veio o `prod.db`.

## Status

- [x] Script ETL versionado
- [x] Dry-run local contra `prod.db`
- [x] Carga real no SQL Server (`FlexDev` / schema `fx_obras`) — contagens OK
- [ ] Smoke `SQL_DIALECT=mssql` + listagem (queries com prefixo `fx_obras.`)
- [ ] Copia de uploads

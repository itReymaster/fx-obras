# Comandos — cutover producao (copy/paste)

Substitua os placeholders antes de rodar:
- `SEU_TOKEN` → valor de `CIRCUIT_BREAKER_TOKEN` em prod
- `Flex` → `DB_DATABASE` real de producao (se for outro, troque)
- caminhos `~/fx-obras-cutover-backup/...` conforme o host

Doc completo: [PASSO-PRODUCAO-cutover.md](./PASSO-PRODUCAO-cutover.md)

---

## A) Preparacao no SQL Server (SSMS / sqlcmd)

### A1. Backup do database (ajuste nome e pasta)

Edite e execute [../sqlserver-backup-pre-migration.sql](../sqlserver-backup-pre-migration.sql)  
ou no SSMS (sem COMPRESSION se a edicao 2008 R2 nao suportar):

```sql
USE master;
GO
BACKUP DATABASE [Flex]
TO DISK = N'D:\SQLBackups\Flex_pre_cutover.bak'
WITH COPY_ONLY, INIT, CHECKSUM, STATS = 10;
GO
```

### A2. Criar schema fx_obras

1. Abra [fx_obras_schema_2008r2.sql](./fx_obras_schema_2008r2.sql)
2. Troque `[SEU_BANCO]` por `[Flex]`
3. Comente o bloco `CREATE USER` / `db_owner` / `DEFAULT_SCHEMA` se for usar `UserService`
4. Execute no SSMS

### A3. Validar 5 tabelas

```sql
USE Flex;
GO
SELECT s.name AS schema_name, t.name AS table_name
FROM sys.tables t
INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = 'fx_obras'
ORDER BY t.name;
GO
```

---

## B) No servidor da aplicacao (Docker host)

### B1. Ir para o projeto

```bash
cd /caminho/do/fx-obras
```

### B2. Conferir containers

```bash
docker ps | grep fx-obras
```

### B3. Backup local SQLite + uploads

```bash
TS=$(date +%Y%m%d-%H%M%S)
BACKUP=~/fx-obras-cutover-backup/$TS
mkdir -p "$BACKUP/uploads"

docker cp fx-obras-backend:/app/data/prod.db "$BACKUP/prod.db"
docker cp fx-obras-backend:/app/uploads/. "$BACKUP/uploads/"

ls -lah "$BACKUP"
find "$BACKUP/uploads" -type f | wc -l
```

### B4. Conferir env no host (exemplo)

Garanta no `.env` do compose (nao commitar senha):

```bash
grep -E '^(SQL_DIALECT|FX_OBRAS_SCHEMA|CIRCUIT_BREAKER_TOKEN|DB_DATABASE|DATABASE_URL|SQLSERVER_)=' .env
```

Valores esperados no **primeiro** boot pos-deploy do codigo novo:

```env
SQL_DIALECT=sqlite
FX_OBRAS_SCHEMA=fx_obras
CIRCUIT_BREAKER_TOKEN=SEU_TOKEN
SQL_DIALECT_BREAKER_FILE=/app/data/sql-dialect.breaker
DB_DATABASE=Flex
DATABASE_URL=file:/app/data/prod.db
SQLSERVER_ENCRYPT=false
SQLSERVER_TRUST_SERVER_CERTIFICATE=true
```

### B5. Deploy do codigo (build + up)

```bash
git status
git pull   # ou o fluxo do pipeline

docker compose build backend frontend
docker compose up -d

docker ps | grep fx-obras
curl -s http://127.0.0.1:3333/health
```

Esperado: `"status":"ok"` e `"sqlDialect":"sqlite"` (ainda no banco antigo).

---

## C) ETL (carga SQLite -> SQL Server)

Faca na janela de manutencao, com escrita congelada.

### C1. Pegar o prod.db atual do container

```bash
mkdir -p /tmp/fx-obras-etl
docker cp fx-obras-backend:/app/data/prod.db /tmp/fx-obras-etl/prod.db
ls -lah /tmp/fx-obras-etl/prod.db
```

### C2. Rodar ETL no ambiente que tem Node + acesso ao SQL

Se for no proprio host do app (exemplo com workspace):

```bash
cd /caminho/do/fx-obras/apps/api

# Use um .env temporario / exportas apontando:
# DATABASE_URL=file:/tmp/fx-obras-etl/prod.db
# DB_* = SQL de PRODUCAO (Flex)
# FX_OBRAS_SCHEMA=fx_obras

export DATABASE_URL="file:/tmp/fx-obras-etl/prod.db"

# dry-run
npm run db:migrate-sqlite-to-mssql -- --dry-run

# carga real
npm run db:migrate-sqlite-to-mssql -- --truncate
```

Esperado no final: `OK — contagens batem.`

### C3. Validar contagens no SSMS

```sql
USE Flex;
GO
SELECT 'ConstructionOpportunity' AS t, COUNT(1) AS n FROM fx_obras.ConstructionOpportunity
UNION ALL SELECT 'Photo', COUNT(1) FROM fx_obras.ConstructionOpportunityPhoto
UNION ALL SELECT 'History', COUNT(1) FROM fx_obras.ConstructionOpportunityHistory
UNION ALL SELECT 'ServiceProvider', COUNT(1) FROM fx_obras.ServiceProvider
UNION ALL SELECT 'OppProvider', COUNT(1) FROM fx_obras.OpportunityServiceProvider;
GO
```

---

## D) Virar para MSSQL (sem redeploy)

### D1. Flip pelo circuit breaker

```bash
curl.exe -s -X POST http://127.0.0.1:3333/api/v2/ops/db-circuit \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"dialect\":\"mssql\",\"reason\":\"cutover producao\"}"
```

Git Bash / Linux:

```bash
curl -s -X POST http://127.0.0.1:3333/api/v2/ops/db-circuit \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dialect":"mssql","reason":"cutover producao"}'
```

### D2. Confirmar

```bash
curl -s http://127.0.0.1:3333/health
curl.exe -s http://127.0.0.1:3333/api/v2/ops/db-circuit \
  -H "Authorization: Bearer SEU_TOKEN"
```

Esperado: `"sqlDialect":"mssql"` / `"active":"mssql"`.

### D3. Smoke manual no browser

1. Login Flex
2. Listagem
3. Detalhe com foto
4. Dashboard
5. Criar obra teste
6. Prestadores

---

## E) Rollback rapido (se precisar)

### E1. Voltar para SQLite

```bash
curl.exe -s -X POST http://127.0.0.1:3333/api/v2/ops/db-circuit \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"dialect\":\"sqlite\",\"reason\":\"rollback incidente\"}"
```

### E2. Alternativa por arquivo no volume

```bash
docker exec fx-obras-backend sh -c 'printf "sqlite\n" > /app/data/sql-dialect.breaker'
docker restart fx-obras-backend
curl -s http://127.0.0.1:3333/health
```

### E3. Confirmar

```bash
curl -s http://127.0.0.1:3333/health
# sqlDialect = sqlite
```

---

## F) Comandos uteis extras

### Status do breaker

```bash
curl.exe -s http://127.0.0.1:3333/api/v2/ops/db-circuit \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Remover override (volta ao SQL_DIALECT do env)

```bash
curl.exe -s -X DELETE http://127.0.0.1:3333/api/v2/ops/db-circuit \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Contar uploads no container

```bash
docker exec fx-obras-backend sh -c 'find /app/uploads -type f | wc -l'
```

### Logs do backend

```bash
docker logs --tail 200 -f fx-obras-backend
```

---

## Ordem minima no dia D

```text
B3 backup -> A1/A2/A3 schema -> B5 deploy (sqlite) -> C ETL -> D1 flip mssql -> D3 smoke
         se falhar: E1 rollback sqlite
```

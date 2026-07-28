# Passo a passo: subir cutover SQL Server em producao

Guia operacional com circuit breaker (rollback sem redeploy).

Referencias:
- **Comandos copy/paste:** [COMANDOS-PRODUCAO.md](./COMANDOS-PRODUCAO.md)
- Schema DDL: [fx_obras_schema_2008r2.sql](./fx_obras_schema_2008r2.sql)
- ETL: [PASSO3-etl.md](./PASSO3-etl.md)
- Circuit breaker: [circuit-breaker-dialect.md](./circuit-breaker-dialect.md)
- Backup SQL: [../sqlserver-backup-pre-migration.sql](../sqlserver-backup-pre-migration.sql)

---

## 0) Premissas

1. Codigo com: schema `fx_obras.` nas queries, sanitizacao de datas, circuit breaker, pill de status no front.
2. **Nao** alterar `DEFAULT_SCHEMA` do `UserService` (quebra Flex).
3. Uploads continuam no volume Docker `fx-obras-uploads` (mesmo path).
4. Prestadores continuam no SQLite ate portar o modulo.
5. Homolog (`FlexDev`) ja validou carga + smoke.

---

## 1) Antes da janela (preparacao)

### 1.1 Banco SQL Server de producao

No database real de prod (`DB_DATABASE`, tipicamente `Flex` — confirme):

1. Backup do database (script de backup; sem `COMPRESSION` se a edicao 2008 R2 nao suportar).
2. Rodar [fx_obras_schema_2008r2.sql](./fx_obras_schema_2008r2.sql) com `USE [Flex];` (ou o nome correto).
3. Validar 5 tabelas:

```sql
USE Flex; -- ajuste
SELECT s.name, t.name
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = 'fx_obras'
ORDER BY t.name;
```

### 1.2 Env de producao (host / `.env` do compose)

Incluir / conferir:

```env
DATABASE_URL=file:/app/data/prod.db
SQL_DIALECT=sqlite
FX_OBRAS_SCHEMA=fx_obras
CIRCUIT_BREAKER_TOKEN=<segredo-forte-de-producao>
SQL_DIALECT_BREAKER_FILE=/app/data/sql-dialect.breaker

DB_HOST=...
DB_PORT=1433
DB_DATABASE=Flex
DB_USER=UserService
DB_PASSWORD=...
# ou DB_PASSWORD_B64=...

DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
SQLSERVER_ENCRYPT=false
SQLSERVER_TRUST_SERVER_CERTIFICATE=true
DB_LOGIN_PROCEDURE=dbo.SPAuthLogin
```

Importante no primeiro boot pos-deploy:
- Subir com `SQL_DIALECT=sqlite` (ou breaker em sqlite).
- So depois da carga ETL virar para `mssql`.

### 1.3 Deploy do codigo

1. Merge/PR da branch `feature/sqlserver-2008r2-cutover` (ou o que for para `main`).
2. Deploy usual (pipeline / `docker compose build && docker compose up -d`).
3. Confirmar containers saudaveis:

```bash
docker ps | grep fx-obras
curl -s http://127.0.0.1:3333/health
```

Esperado no health: `sqlDialect` (sqlite ou mssql) e app ok. Front deve mostrar o pill do banco.

### 1.4 Garantir SQLite + uploads no volume

```bash
# SQLite atual de prod (volume data)
docker exec fx-obras-backend ls -la /app/data

# Uploads
docker exec fx-obras-backend sh -c 'find /app/uploads -type f | wc -l'
```

Fazer copia de seguranca no host:

```bash
mkdir -p ~/fx-obras-cutover-backup/$(date +%Y%m%d-%H%M%S)
# ajuste paths conforme o host
docker cp fx-obras-backend:/app/data/prod.db ~/fx-obras-cutover-backup/.../prod.db
docker cp fx-obras-backend:/app/uploads/. ~/fx-obras-cutover-backup/.../uploads/
```

---

## 2) Janela de manutencao (cutover)

### 2.1 Congelar escrita

1. Avisar usuarios / colocar aviso de manutencao.
2. Ideal: manter app so leitura ou offline curto.

### 2.2 Backup final

1. Backup SQL Server prod.
2. Copia final `prod.db` + `uploads`.

### 2.3 Carga ETL SQLite -> SQL Server

No servidor (ou maquina com acesso ao SQL + ao `prod.db`):

```bash
# Exemplo: copiar prod.db do container para o host de trabalho
docker cp fx-obras-backend:/app/data/prod.db ./prod.db

# Rodar ETL apontando DATABASE_URL para esse arquivo e DB_* para o SQL de PROD
cd apps/api
# .env com DB_DATABASE=Flex (prod), SQLSERVER_*, FX_OBRAS_SCHEMA=fx_obras
npm run db:migrate-sqlite-to-mssql -- --truncate
```

Validar contagens no SSMS (origem = destino).

### 2.4 Virar para MSSQL (sem rebuild)

Opcao A — circuit breaker (recomendado):

```bash
curl.exe -X POST http://127.0.0.1:3333/api/v2/ops/db-circuit \
  -H "Authorization: Bearer SEU_TOKEN_DE_PROD" \
  -H "Content-Type: application/json" \
  -d "{\"dialect\":\"mssql\",\"reason\":\"cutover producao\"}"
```

Opcao B — env + restart:

```env
SQL_DIALECT=mssql
```

```bash
docker compose up -d backend
```

Confirmar:

```bash
curl -s http://127.0.0.1:3333/health
# sqlDialect = mssql
```

Front: pill **SQL Server**.

### 2.5 Smoke test (obrigatorio)

1. Login ERP Flex.
2. Listagem de obras.
3. Detalhe com foto (uploads do volume).
4. Dashboard.
5. Criar obra de teste.
6. Editar / soft delete.
7. Prestadores (ainda SQLite — so garantir que nao quebrou).

Se ok → liberar usuarios.

---

## 3) Rollback rapido (sem redeploy)

Se algo critico falhar:

```bash
curl.exe -X POST http://127.0.0.1:3333/api/v2/ops/db-circuit \
  -H "Authorization: Bearer SEU_TOKEN_DE_PROD" \
  -H "Content-Type: application/json" \
  -d "{\"dialect\":\"sqlite\",\"reason\":\"rollback incidente\"}"
```

Ou:

```bash
# dentro do volume persistente /app/data
echo sqlite > /app/data/sql-dialect.breaker
# se necessario restart do backend
docker restart fx-obras-backend
```

Efeitos:
- Volta a ler/gravar obras no SQLite.
- Uploads no mesmo volume (arquivos nao somem).
- Obras criadas **so no MSSQL** apos o cutover **nao** aparecem no SQLite ate reconciliar.

---

## 4) Pos-cutover (estabilizacao)

1. Monitorar logs do backend 24–48h.
2. Nao apagar `prod.db` nem o breaker file.
3. Manter `CIRCUIT_BREAKER_TOKEN` secreto (so localhost/ops).
4. Planejar: portar service-providers para SQL Server.
5. Quando estiver estavel por um ciclo de negocio, documentar “MSSQL padrao” e reduzir dependencia do SQLite.

---

## 5) Checklist resumido

- [ ] Backup SQL Server prod
- [ ] Backup `prod.db` + uploads
- [ ] Schema `fx_obras` com 5 tabelas em prod
- [ ] Deploy do codigo (breaker + queries com schema)
- [ ] Env com `CIRCUIT_BREAKER_TOKEN`, `FX_OBRAS_SCHEMA`, `SQLSERVER_*`
- [ ] ETL `--truncate` com contagens OK
- [ ] Flip para `mssql`
- [ ] Smoke completo
- [ ] Rollback ensaiado (pelo menos em homolog)

---

## 6) Ordem recomendada no dia

1. Deploy codigo com `SQL_DIALECT=sqlite` (app ainda no banco antigo).
2. Schema + ETL no SQL de prod (janela curta).
3. Flip breaker → `mssql`.
4. Smoke.
5. Se ruim → breaker → `sqlite` imediatamente.

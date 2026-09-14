# Circuit breaker: SQLite <-> SQL Server sem redeploy

## O que faz

Permite trocar o dialecto das **obras v2** em runtime:

- `mssql` → Sequelize + schema `fx_obras`
- `sqlite` → Prisma + `DATABASE_URL` (banco anterior)

**Sem rebuild de imagem** e **sem novo deploy de codigo** — so uma chamada HTTP (ou editar o arquivo de override).

Auth ERP Flex continua sempre no SQL Server (`SPAuthLogin`).
Uploads continuam no filesystem (mesmo volume).
Service providers continuam no Prisma/SQLite.

## Prioridade

1. Override em memoria (apos POST)
2. Arquivo `data/sql-dialect.breaker` (persiste entre restarts do processo)
3. `SQL_DIALECT` do `.env`

## Config

No `.env` da API:

```env
SQL_DIALECT=mssql
CIRCUIT_BREAKER_TOKEN=um-segredo-forte
# SQL_DIALECT_BREAKER_FILE=/app/data/sql-dialect.breaker   # opcional
```

Garanta que o arquivo de breaker fica em volume persistente (ex.: `/app/data`), senao o override some se o container for recriado sem volume.

## Uso (producao / homolog)

Status:

```bash
curl -s http://127.0.0.1:3333/api/v2/ops/db-circuit \
  -H "Authorization: Bearer $CIRCUIT_BREAKER_TOKEN"
```

Voltar para SQLite (rollback rapido):

```bash
curl -s -X POST http://127.0.0.1:3333/api/v2/ops/db-circuit \
  -H "Authorization: Bearer $CIRCUIT_BREAKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dialect":"sqlite","reason":"incidente pos-cutover"}'
```

Reativar MSSQL:

```bash
curl -s -X POST http://127.0.0.1:3333/api/v2/ops/db-circuit \
  -H "Authorization: Bearer $CIRCUIT_BREAKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dialect":"mssql","reason":"retomada apos correcao"}'
```

Remover override (volta ao `SQL_DIALECT` do env):

```bash
curl -s -X DELETE http://127.0.0.1:3333/api/v2/ops/db-circuit \
  -H "Authorization: Bearer $CIRCUIT_BREAKER_TOKEN"
```

`GET /health` tambem reporta `sqlDialect` ativo.

## Limites importantes

1. **Dados nao sincronizam sozinhos.** Obra criada no MSSQL depois do cutover **nao** aparece no SQLite ao fazer rollback (e o inverso tambem). Rollback serve para estabilizar leitura/escrita no banco antigo; depois e preciso reconciliar se houve escrita no novo.
2. Mantenha o arquivo SQLite (`DATABASE_URL`) e o volume de uploads disponiveis no host mesmo com `SQL_DIALECT=mssql`.
3. Proteja `CIRCUIT_BREAKER_TOKEN`. Nao exponha a rota `/api/v2/ops` na internet sem auth de rede.
4. Isso **nao** substitui backup. Continua obrigatorio backup SQL + SQLite + uploads antes da virada.

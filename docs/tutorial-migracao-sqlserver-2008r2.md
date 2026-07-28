# Tutorial: migrar o banco para SQL Server 2008 R2 (runbook atualizado)

## 1) Objetivo

Migrar os dados do app de **SQLite (Prisma)** para **SQL Server 2008 R2**, sem upgrade do SQL Server, mantendo endpoints e comportamento do produto.

Premissas:
1. Prisma **nao** e o caminho de producao no 2008 R2.
2. A API v2 com **Sequelize + tedious** ja existe no repositorio; este guia **nao** pede reescrita greenfield.
3. Auth ERP Flex continua no SQL Server (procedure `dbo.SPAuthLogin`); dados do app passam a viver no schema `fx_obras`.

Resultado esperado:
- API com `SQL_DIALECT=mssql` lendo/escrevendo no SQL Server 2008 R2.
- Mesmos fluxos do app (obras, fotos, historico, providers, audio).
- Dados e arquivos migrados e validados.

Documento complementar de preparo de infra: [sql-server-pre-requisitos.md](./sql-server-pre-requisitos.md).

---

## 2) Arquitetura real (estado atual do codigo)

```text
Web (/api/v2)
  |
  +--> construction-opportunities v2
  |      |-- SQL_DIALECT=sqlite  --> Prisma + SQLite (DATABASE_URL)
  |      +-- SQL_DIALECT=mssql   --> Sequelize + SQL Server
  |
  +--> service-providers ----------> Prisma + SQLite (ainda)
  |
  +--> auth ERP Flex --------------> SQL Server (DB_*) + SPAuthLogin
  |
  +--> uploads (fotos / thumbs / audio) --> filesystem (UPLOAD_DIR)
```

Arquivos-chave (ja existentes):
- `apps/api/src/shared/database/sequelize.ts`
- `apps/api/src/modules/construction-opportunities/v2/construction-opportunity.sequelize.repository.ts`
- `apps/api/src/modules/construction-opportunities/routes/construction-opportunities.v2.routes.ts`
- `apps/api/src/config/env.ts`
- `apps/api/prisma/schema.prisma` (fonte de verdade do modelo de dados)

Dois papeis do SQL Server:
1. **Auth Flex:** procedure `dbo.SPAuthLogin` no banco ERP (tipicamente `Flex`).
2. **Dados do app:** tabelas no schema `fx_obras` quando `SQL_DIALECT=mssql`.

Importante: as mesmas variaveis `DB_*` alimentam auth e o pool Sequelize. Por isso este runbook usa **schema `fx_obras` no banco ja apontado por `DB_DATABASE`**, e **todas as queries do app qualificam o schema** (`fx_obras.ConstructionOpportunity`).

Nao altere `DEFAULT_SCHEMA` do `UserService` do Flex — isso quebra procedures/objetos em `dbo` (ex.: `SPAuthLogin`).

---

## 3) Pre-requisitos

Checklist obrigatorio:
1. Seguir [sql-server-pre-requisitos.md](./sql-server-pre-requisitos.md) (rede, login, schema, permissoes).
2. Instancia SQL Server 2008 R2 acessivel da API.
3. Backup do SQLite atual (`DATABASE_URL`, tipicamente `apps/api/prisma/dev.db` ou o arquivo de producao).
4. Backup do banco SQL Server alvo (ver [sqlserver-backup-pre-migration.sql](./sqlserver-backup-pre-migration.sql); em 2008 R2, `COMPRESSION` pode falhar conforme edicao — remova se necessario).
5. Copia do diretorio de uploads (`UPLOAD_DIR`: fotos, thumbs, audio).
6. Ambiente de homologacao separado de producao.
7. Branch dedicada, exemplo: `feature/sqlserver-2008r2-cutover`.

Nao faca big bang direto em producao.

---

## 4) Fase A — Preparar schema no SQL Server

Script DDL versionado (pronto para executar em homolog): [sql/fx_obras_schema_2008r2.sql](./sql/fx_obras_schema_2008r2.sql).  
Checklist do Passo 1: [sql/PASSO1-checklist.md](./sql/PASSO1-checklist.md).

### 4.1 Topologia escolhida

1. Usar o database ja configurado em `DB_DATABASE` (homolog/producao).
2. Criar schema `fx_obras`.
3. Criar as 5 tabelas do app nesse schema.
4. Qualificar queries com `fx_obras.` no codigo (ETL e repositorio Sequelize). Nao mudar DEFAULT_SCHEMA do UserService.

Substitua `[SEU_BANCO]` pelo valor real de `DB_DATABASE`.

### 4.2 Schema e usuario

```sql
USE [SEU_BANCO];
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'fx_obras')
BEGIN
  EXEC('CREATE SCHEMA fx_obras AUTHORIZATION dbo;');
END
GO

-- Usuario do app (ajuste o LOGIN conforme politica)
IF NOT EXISTS (
  SELECT 1 FROM sys.database_principals WHERE name = 'fx_obras_app'
)
BEGIN
  CREATE USER [fx_obras_app] FOR LOGIN [fx_obras_app];
END
GO

ALTER USER [fx_obras_app] WITH DEFAULT_SCHEMA = [fx_obras];
GO
```

Permissoes na migracao/homologacao (temporario):

```sql
USE [SEU_BANCO];
GO
ALTER ROLE db_owner ADD MEMBER [fx_obras_app];
GO
```

Apos estabilizar, remover `db_owner` e aplicar grants restritos:

```sql
USE [SEU_BANCO];
GO
ALTER ROLE db_owner DROP MEMBER [fx_obras_app];
GO
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::fx_obras TO [fx_obras_app];
GRANT ALTER, CONTROL ON SCHEMA::fx_obras TO [fx_obras_app];
GO
```

### 4.3 Mapeamento de tipos (2008 R2)

| Prisma / app | SQL Server 2008 R2 |
|---|---|
| `String` | `NVARCHAR(...)` / `NVARCHAR(MAX)` |
| `Boolean` | `BIT` |
| `DateTime` | `DATETIME` (sem timezone) |
| `Float` | `FLOAT` |
| `Int` | `INT` |
| UUID (`String`) | `UNIQUEIDENTIFIER` |

Convencao de datas: o app trata instantes em UTC; `DATETIME` no SQL Server nao guarda offset. Na carga e nas leituras, manter a mesma convencao (UTC) para nao deslocar `capturedAt` / historico.

Collation: documentar a collation do database alvo e validar filtros de texto (cidade, busca) com dados reais.

### 4.4 DDL completo (5 tabelas)

```sql
USE [SEU_BANCO];
GO

CREATE TABLE fx_obras.ConstructionOpportunity (
  id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  code NVARCHAR(50) NOT NULL,
  title NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX) NULL,
  constructionType NVARCHAR(50) NOT NULL,
  constructionStage NVARCHAR(50) NOT NULL,
  commercialPotential NVARCHAR(50) NOT NULL,
  status NVARCHAR(50) NOT NULL,
  addressSource NVARCHAR(50) NOT NULL,
  postalCode NVARCHAR(20) NULL,
  street NVARCHAR(255) NULL,
  number NVARCHAR(50) NULL,
  withoutNumber BIT NOT NULL CONSTRAINT DF_Opp_WithoutNumber DEFAULT 0,
  complement NVARCHAR(255) NULL,
  district NVARCHAR(255) NULL,
  city NVARCHAR(255) NULL,
  state NVARCHAR(2) NULL,
  latitude FLOAT NULL,
  longitude FLOAT NULL,
  locationAccuracy FLOAT NULL,
  locationCapturedAt DATETIME NULL,
  constructionCompany NVARCHAR(255) NULL,
  estimatedCompletionDate DATETIME NULL,
  contactName NVARCHAR(255) NULL,
  contactCompany NVARCHAR(255) NULL,
  contactRole NVARCHAR(255) NULL,
  contactPhone NVARCHAR(50) NULL,
  contactEmail NVARCHAR(255) NULL,
  nextAction NVARCHAR(255) NULL,
  nextActionDate DATETIME NULL,
  notes NVARCHAR(MAX) NULL,
  tags NVARCHAR(MAX) NULL,
  crmIntegrationStatus NVARCHAR(50) NOT NULL CONSTRAINT DF_Opp_CrmStatus DEFAULT N'NOT_SENT',
  crmExternalId NVARCHAR(255) NULL,
  crmLastAttemptAt DATETIME NULL,
  crmIntegrationMessage NVARCHAR(MAX) NULL,
  capturedAt DATETIME NOT NULL,
  createdByUserId NVARCHAR(100) NULL,
  updatedByUserId NVARCHAR(100) NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  deletedAt DATETIME NULL,
  isDeleted BIT NOT NULL CONSTRAINT DF_Opp_IsDeleted DEFAULT 0,
  isTest BIT NOT NULL CONSTRAINT DF_Opp_IsTest DEFAULT 0,
  CONSTRAINT UQ_Opp_Code UNIQUE (code)
);
GO

CREATE TABLE fx_obras.ConstructionOpportunityPhoto (
  id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  constructionOpportunityId UNIQUEIDENTIFIER NOT NULL,
  originalName NVARCHAR(255) NOT NULL,
  storedName NVARCHAR(255) NOT NULL,
  relativePath NVARCHAR(500) NOT NULL,
  thumbnailRelativePath NVARCHAR(500) NULL,
  mimeType NVARCHAR(100) NOT NULL,
  size INT NOT NULL,
  isPrimary BIT NOT NULL CONSTRAINT DF_Photo_IsPrimary DEFAULT 0,
  createdAt DATETIME NOT NULL,
  CONSTRAINT FK_Photo_Opportunity FOREIGN KEY (constructionOpportunityId)
    REFERENCES fx_obras.ConstructionOpportunity(id)
    ON DELETE CASCADE
);
GO

CREATE TABLE fx_obras.ConstructionOpportunityHistory (
  id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  constructionOpportunityId UNIQUEIDENTIFIER NOT NULL,
  action NVARCHAR(100) NOT NULL,
  previousValue NVARCHAR(MAX) NULL,
  newValue NVARCHAR(MAX) NULL,
  description NVARCHAR(MAX) NULL,
  createdAt DATETIME NOT NULL,
  CONSTRAINT FK_History_Opportunity FOREIGN KEY (constructionOpportunityId)
    REFERENCES fx_obras.ConstructionOpportunity(id)
    ON DELETE CASCADE
);
GO

CREATE TABLE fx_obras.ServiceProvider (
  id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  name NVARCHAR(255) NOT NULL,
  type NVARCHAR(100) NOT NULL,
  phone NVARCHAR(50) NULL,
  email NVARCHAR(255) NULL,
  city NVARCHAR(255) NULL,
  notes NVARCHAR(MAX) NULL,
  isActive BIT NOT NULL CONSTRAINT DF_Provider_IsActive DEFAULT 1,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  deletedAt DATETIME NULL
);
GO

CREATE TABLE fx_obras.OpportunityServiceProvider (
  id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  constructionOpportunityId UNIQUEIDENTIFIER NOT NULL,
  serviceProviderId UNIQUEIDENTIFIER NOT NULL,
  role NVARCHAR(100) NULL,
  createdAt DATETIME NOT NULL,
  CONSTRAINT FK_OppProv_Opportunity FOREIGN KEY (constructionOpportunityId)
    REFERENCES fx_obras.ConstructionOpportunity(id)
    ON DELETE CASCADE,
  CONSTRAINT FK_OppProv_Provider FOREIGN KEY (serviceProviderId)
    REFERENCES fx_obras.ServiceProvider(id)
    ON DELETE CASCADE,
  CONSTRAINT UQ_OppProv UNIQUE (constructionOpportunityId, serviceProviderId)
);
GO

CREATE INDEX IX_Opportunity_City_District ON fx_obras.ConstructionOpportunity(city, district);
CREATE INDEX IX_Opportunity_Status ON fx_obras.ConstructionOpportunity(status);
CREATE INDEX IX_Opportunity_ConstructionType ON fx_obras.ConstructionOpportunity(constructionType);
CREATE INDEX IX_Opportunity_CapturedAt ON fx_obras.ConstructionOpportunity(capturedAt);
CREATE INDEX IX_Photo_OpportunityId ON fx_obras.ConstructionOpportunityPhoto(constructionOpportunityId);
CREATE INDEX IX_History_OpportunityId_CreatedAt ON fx_obras.ConstructionOpportunityHistory(constructionOpportunityId, createdAt);
CREATE INDEX IX_Provider_Name ON fx_obras.ServiceProvider(name);
CREATE INDEX IX_Provider_Type ON fx_obras.ServiceProvider(type);
CREATE INDEX IX_Provider_IsActive ON fx_obras.ServiceProvider(isActive);
CREATE INDEX IX_OppProv_OpportunityId ON fx_obras.OpportunityServiceProvider(constructionOpportunityId);
CREATE INDEX IX_OppProv_ProviderId ON fx_obras.OpportunityServiceProvider(serviceProviderId);
GO
```

Audio **nao** tem tabela: fica apenas no filesystem em `UPLOAD_DIR/.../audio/{opportunityId}/`.

### 4.5 Validacao rapida do schema

```sql
USE [SEU_BANCO];
GO

SELECT s.name AS schema_name, t.name AS table_name
FROM sys.tables t
INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = 'fx_obras'
ORDER BY t.name;
GO
```

Esperado: 5 tabelas.

---

## 5) Fase B — Configurar a API (nao reescrever persistencia)

### 5.1 Dependencias

Nao instale o pacote `npm mssql` para este cutover. O projeto ja usa:
- `sequelize`
- `tedious`

Modulo de conexao ja existente: `apps/api/src/shared/database/sequelize.ts`.

### 5.2 Variaveis de ambiente (valores reais do codigo)

No `.env` da API:

```env
# Persistencia do app
SQL_DIALECT=mssql
DATABASE_URL="file:./dev.db"

# SQL Server (auth Flex + pool Sequelize compartilham DB_*)
DB_HOST=SEU_SERVIDOR
DB_PORT=1433
DB_DATABASE=SEU_BANCO
DB_USER=fx_obras_app
DB_PASSWORD=sua_senha
# Opcional se a senha tiver caracteres especiais:
# DB_PASSWORD_B64=

DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
DB_LOGIN_PROCEDURE=dbo.SPAuthLogin

# Pool Sequelize (lidos explicitamente pelo app)
SQLSERVER_ENCRYPT=false
SQLSERVER_TRUST_SERVER_CERTIFICATE=true

UPLOAD_DIR=uploads/construction-opportunities
```

Aliases tambem aceitos pelo codigo: `SQLSERVER_*` e `ERP_FLEX_SQLSERVER_*` (ver `apps/api/src/config/env.ts`).

Observacoes 2008 R2:
1. Em rede interna, em geral `encrypt=false`.
2. Configure **tanto** `DB_ENCRYPT` (auth) quanto `SQLSERVER_ENCRYPT` (Sequelize); o pool do app **nao** herda so de `DB_ENCRYPT`.
3. Configure `FX_OBRAS_SCHEMA=fx_obras` (default). A API usa `fx_obras.Tabela` nas queries — sem depender de DEFAULT_SCHEMA.

### 5.3 Smoke de conexao

1. Subir a API com `SQL_DIALECT=mssql`.
2. Confirmar no log ausencia de erro de conexao Sequelize.
3. Chamar um GET de listagem `/api/v2/construction-opportunities` (pode retornar vazio antes da carga).

---

## 6) Fase C — Lacunas de codigo antes da virada

A listagem abaixo e **bloqueante** para cutover seguro. Corrigir em homologacao antes da carga final.

### 6.1 Obrigatorio

1. **Foto / thumbnail:** `createPhoto` no repositorio Sequelize deve persistir `thumbnailRelativePath` (hoje o INSERT omite a coluna; o arquivo pode ser gerado em disco e nao gravado no banco).
2. **Listagem de fotos:** `mapPhotoRow` / `findPhotosByOpportunityIds` deve preservar `constructionOpportunityId` para o agrupamento por obra na listagem.
3. **CRM read path:** mapear `crmIntegrationMessage` e `crmLastAttemptAt` (colunas reais do schema), nao nomes inventados no dominio de leitura.
4. **Service providers:** o modulo ainda usa Prisma/SQLite. Antes de desligar SQLite em producao, implementar leitura/escrita em SQL Server (mesmo schema `fx_obras`) ou manter `DATABASE_URL` apenas para providers (estado hibrido temporario, documentado).

### 6.2 Regras de negocio que o repositorio SQL ja deve manter

1. `delete` = soft delete (`isDeleted = 1`, `deletedAt` preenchido).
2. `countByYear` conta inclusive deletados (sequencia de codigo).
3. `tags` no banco = JSON string; na API = `string[]`.
4. Paginacao com `ROW_NUMBER()` (2008 R2 nao tem `OFFSET ... FETCH`).

Exemplo de paginacao compativel:

```sql
WITH Ordered AS (
  SELECT
    *,
    ROW_NUMBER() OVER (ORDER BY capturedAt DESC) AS rn
  FROM ConstructionOpportunity
  WHERE isDeleted = 0
)
SELECT *
FROM Ordered
WHERE rn BETWEEN @startRow AND @endRow;
```

---

## 7) Fase D — Migracao de dados e arquivos

### 7.1 Escopo

Migrar:
1. Tabelas: `ConstructionOpportunity`, `ConstructionOpportunityPhoto`, `ConstructionOpportunityHistory`, `ServiceProvider`, `OpportunityServiceProvider`.
2. Arquivos: fotos, thumbnails e pastas de audio sob `UPLOAD_DIR`.

Nao ha script ETL pronto no repositorio. Implementar um script unico (Node/TS ou processo DBA) que cumpra o contrato abaixo.

### 7.2 Ordem de carga (integridade de FK)

1. `ServiceProvider`
2. `ConstructionOpportunity`
3. `ConstructionOpportunityPhoto`
4. `ConstructionOpportunityHistory`
5. `OpportunityServiceProvider`

### 7.3 Regras de conversao

| Origem SQLite | Destino SQL Server |
|---|---|
| UUID texto (`36` chars) | `UNIQUEIDENTIFIER` via `CAST(... AS UNIQUEIDENTIFIER)` ou insert tipado no driver |
| Boolean `0/1` | `BIT` |
| `tags` JSON string | `NVARCHAR(MAX)` (manter o mesmo JSON) |
| Datas ISO / epoch | `DATETIME` em UTC coerente com o app |
| `NULL` | `NULL` |
| IDs | **preservar** os mesmos UUIDs |

Regras operacionais:
1. Carga idempotente: truncar schema de homolog ou usar `MERGE`/delete+insert controlado antes de reimportar.
2. Freeze de escrita no SQLite durante a carga final de producao.
3. Nao gerar novos IDs na importacao.

### 7.4 Arquivos (critico)

1. Copiar integralmente o diretorio de `UPLOAD_DIR` (fotos originais).
2. Copiar thumbs se existirem; se `thumbnailRelativePath` estiver nulo apos a carga, rodar `npm run photos:backfill-thumbs -w @obras-prospect/api` (ou equivalente) **depois** que o dialecto apontar para a base correta.
3. Copiar `UPLOAD_DIR/audio/{opportunityId}/` preservando nomes relativos — o app lista audio pelo filesystem, nao pelo banco.
4. Validar que `relativePath` / `thumbnailRelativePath` no banco batem com caminhos reais no volume.

### 7.5 Validacao pos-carga (SQL)

Comparar origem (SQLite) x destino (SQL Server):

```sql
SELECT COUNT(1) AS total_obras FROM fx_obras.ConstructionOpportunity;
SELECT COUNT(1) AS total_fotos FROM fx_obras.ConstructionOpportunityPhoto;
SELECT COUNT(1) AS total_historico FROM fx_obras.ConstructionOpportunityHistory;
SELECT COUNT(1) AS total_providers FROM fx_obras.ServiceProvider;
SELECT COUNT(1) AS total_links FROM fx_obras.OpportunityServiceProvider;
SELECT COUNT(1) AS obras_deletadas FROM fx_obras.ConstructionOpportunity WHERE isDeleted = 1;
SELECT COUNT(1) AS obras_teste FROM fx_obras.ConstructionOpportunity WHERE isTest = 1;
SELECT COUNT(1) AS fotos_sem_thumb FROM fx_obras.ConstructionOpportunityPhoto WHERE thumbnailRelativePath IS NULL;
```

As contagens devem bater com a origem. Investigar divergencia antes de homologar.

---

## 8) Fase E — Homologacao

### 8.1 Checklist funcional

1. Login ERP Flex (auth SQL Server).
2. Navegacao mobile e desktop.
3. Criar / editar / excluir obra (soft delete).
4. Anexar / remover foto; definir foto principal.
5. Thumbnails aparecem na listagem/detalhe.
6. Upload / listagem / remocao de audio.
7. Cadastro e vinculo de prestadores (service providers).
8. Filtros, ordenacao e paginacao da listagem.
9. Dashboard / agregacao por status.
10. Detalhe com historico.
11. Campos CRM exibidos corretamente apos tentativa de integracao (se usada).

### 8.2 Checklist tecnico

1. Sem erro de conexao no log (Sequelize + auth).
2. `SQL_DIALECT=mssql` ativo no ambiente de teste.
3. Tempo de resposta aceitavel em listagem/dashboard com volume real.
4. Indices usados nas consultas principais (plano de execucao).
5. Rollback ensaiado (ver secao 9).

---

## 9) Virada para producao (runbook)

### 9.1 Cutover

1. Avisar janela de manutencao e congelar escrita no app.
2. Backup final do SQLite + copia final de `UPLOAD_DIR`.
3. Backup do banco SQL Server alvo.
4. Executar carga final (dados + arquivos) no SQL Server.
5. Rodar validacao de contagens (secao 7.5).
6. Garantir lacunas da Fase C corrigidas no build que sera publicado.
7. Definir env de producao:
   - `SQL_DIALECT=mssql`
   - `DB_*` / `SQLSERVER_ENCRYPT` / `SQLSERVER_TRUST_SERVER_CERTIFICATE`
   - `UPLOAD_DIR` apontando para o volume ja sincronizado
8. Reiniciar API.
9. Smoke test: login, listar, criar, editar, excluir, foto, audio, provider.
10. Liberar uso.

### 9.2 Rollback

1. Colocar app em manutencao.
2. Restaurar env:
   - `SQL_DIALECT=sqlite`
   - `DATABASE_URL` apontando para o SQLite do backup da janela
3. Restaurar `UPLOAD_DIR` a partir do backup de arquivos da janela (se houve escrita no volume novo).
4. Reiniciar API.
5. Smoke test no caminho SQLite.
6. Investigar causa em homologacao antes de nova tentativa.

Rollback **nao** e so trocar uma variavel: dialecto, SQLite e filesystem precisam voltar juntos.

---

## 10) Riscos e mitigacoes

| Risco | Mitigacao |
|---|---|
| Query incompativel com 2008 R2 | Usar apenas SQL ja validado (`ROW_NUMBER`, `TOP`, CTE); evitar `OFFSET/FETCH` |
| Schema incompleto | DDL com 5 tabelas + `thumbnailRelativePath` |
| Providers ainda no Prisma | Portar ou manter hibrido documentado ate portar |
| Thumbnails / fotos na listagem | Corrigir INSERT e mapeamento antes do cutover |
| Auth e dados no mesmo `DB_*` | Schema `fx_obras` + queries qualificas (`fx_obras.Tabela`); nao alterar DEFAULT_SCHEMA do UserService |
| Compressao de backup falha | Remover `COMPRESSION` no script de backup em edicoes sem suporte |
| Timezone / collation | UTC no app; validar filtros com collation real |
| Regressao funcional | Checklist da Fase E + ensaio de rollback |
| Performance | Indices do DDL + planos nas consultas de lista/dashboard |

---

## 11) Definicao de pronto

Migracao concluida quando:
1. API de obras roda com `SQL_DIALECT=mssql` no SQL Server 2008 R2.
2. Contagens de dados e arquivos batem com a origem.
3. Checklist funcional (incluindo providers, audio, thumbs, login) passa.
4. Lacunas da Fase C estao corrigidas no codigo publicado.
5. Rollback foi ensaiado.
6. Time de negocio valida um ciclo completo de uso.

---

## 12) Cronograma realista (trabalho restante)

Este nao e mais um greenfield de 3 dias. Ordem sugerida:

**Semana 1 — fundacao**
1. Schema `fx_obras` + DDL completo em homologacao.
2. Env `SQL_DIALECT=mssql` + smoke de conexao.
3. Corrigir lacunas da Fase C (thumbs, fotos listagem, CRM map).

**Semana 2 — carga e providers**
1. Script ETL SQLite -> SQL Server com validacao de contagens.
2. Copia de uploads (fotos/thumbs/audio).
3. Portar service-providers para SQL Server (ou hibrido controlado).

**Semana 3 — homologacao e virada**
1. Checklist funcional completo.
2. Ensaio de rollback.
3. Cutover de producao com janela e runbook da secao 9.

---

## 13) Referencias do repositorio

1. Pre-requisitos de infra: [sql-server-pre-requisitos.md](./sql-server-pre-requisitos.md)
2. Backup SQL Server: [sqlserver-backup-pre-migration.sql](./sqlserver-backup-pre-migration.sql)
3. Plano de convivencia API v2: [plano-api-v2-sequelize-migracao.md](./plano-api-v2-sequelize-migracao.md) (nota: a v2 ja vive em `apps/api`, nao em `apps/api-v2`)
4. Schema Prisma (fonte de campos): `apps/api/prisma/schema.prisma`
5. Repositorio Sequelize: `apps/api/src/modules/construction-opportunities/v2/construction-opportunity.sequelize.repository.ts`

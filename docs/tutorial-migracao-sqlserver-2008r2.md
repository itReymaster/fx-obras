# Tutorial didatico: migrar o banco para SQL Server 2008 R2 sem trocar a versao do SQL

## 1) Objetivo deste guia
Este guia mostra como migrar o projeto de SQLite para SQL Server 2008 R2 **sem upgrade do SQL Server**.

Como o projeto usa Prisma, o ponto principal e:
- Prisma atual nao suporta bem SQL Server 2008 R2 em producao.
- Para manter o SQL 2008 R2, a camada de persistencia deve sair de Prisma e ir para SQL nativo (driver mssql).

Resultado esperado ao final:
- API rodando no SQL Server 2008 R2.
- Mesmos endpoints e comportamento do app.
- Dados migrados do SQLite para SQL Server.

---

## 2) Contexto do projeto (ja existente)
Arquivos relevantes hoje:
- `apps/api/prisma/schema.prisma` (datasource SQLite)
- `apps/api/src/modules/construction-opportunities/repositories/construction-opportunity.repository.ts` (repositorio principal)

Metodos que o novo repositorio SQL deve manter:
- `findById`
- `findByCode`
- `findAll`
- `create`
- `update`
- `delete` (soft delete)
- `count`
- `countByYear`
- `aggregateByStatus`

---

## 3) Estrategia recomendada (segura)
Implementar em fases para reduzir risco:

1. Fase A: preparar SQL Server 2008 R2 (schema e indices)
2. Fase B: criar nova camada DB com `mssql`
3. Fase C: criar repositorio SQL mantendo a mesma interface
4. Fase D: migrar dados SQLite -> SQL Server
5. Fase E: homologar e virar producao

Nao faca "big bang" direto em producao.

---

## 4) Pre requisitos

1. SQL Server 2008 R2 acessivel em rede
2. Credencial com permissao para criar tabelas/indices
3. Backup do SQLite atual
4. Branch dedicada, exemplo: `feature/sqlserver-2008r2-migration`

---

## 5) Fase A - Preparar banco SQL Server

## 5.1 Criar database
Exemplo:

```sql
CREATE DATABASE fx_obras;
GO
```

## 5.2 Tipos recomendados para 2008 R2
Use estes mapeamentos:
- `String` -> `NVARCHAR(...)` ou `NVARCHAR(MAX)`
- `Boolean` -> `BIT`
- `DateTime` -> `DATETIME`
- `Float` -> `FLOAT`
- `Int` -> `INT`
- `UUID` -> `UNIQUEIDENTIFIER`

## 5.3 Script base de tabelas (ajuste antes de rodar)

```sql
USE fx_obras;
GO

CREATE TABLE ConstructionOpportunity (
  id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  code NVARCHAR(50) NOT NULL UNIQUE,
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
  withoutNumber BIT NOT NULL DEFAULT 0,
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
  crmIntegrationStatus NVARCHAR(50) NOT NULL DEFAULT 'NOT_SENT',
  crmExternalId NVARCHAR(255) NULL,
  crmLastAttemptAt DATETIME NULL,
  crmIntegrationMessage NVARCHAR(MAX) NULL,
  capturedAt DATETIME NOT NULL,
  createdByUserId NVARCHAR(100) NULL,
  updatedByUserId NVARCHAR(100) NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  deletedAt DATETIME NULL,
  isDeleted BIT NOT NULL DEFAULT 0,
  isTest BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE ConstructionOpportunityPhoto (
  id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  constructionOpportunityId UNIQUEIDENTIFIER NOT NULL,
  originalName NVARCHAR(255) NOT NULL,
  storedName NVARCHAR(255) NOT NULL,
  relativePath NVARCHAR(500) NOT NULL,
  mimeType NVARCHAR(100) NOT NULL,
  size INT NOT NULL,
  isPrimary BIT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL,
  CONSTRAINT FK_Photo_Opportunity FOREIGN KEY (constructionOpportunityId)
    REFERENCES ConstructionOpportunity(id)
    ON DELETE CASCADE
);
GO

CREATE TABLE ConstructionOpportunityHistory (
  id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  constructionOpportunityId UNIQUEIDENTIFIER NOT NULL,
  action NVARCHAR(100) NOT NULL,
  previousValue NVARCHAR(MAX) NULL,
  newValue NVARCHAR(MAX) NULL,
  description NVARCHAR(MAX) NULL,
  createdAt DATETIME NOT NULL,
  CONSTRAINT FK_History_Opportunity FOREIGN KEY (constructionOpportunityId)
    REFERENCES ConstructionOpportunity(id)
    ON DELETE CASCADE
);
GO

CREATE INDEX IX_Opportunity_City_District ON ConstructionOpportunity(city, district);
CREATE INDEX IX_Opportunity_Status ON ConstructionOpportunity(status);
CREATE INDEX IX_Opportunity_ConstructionType ON ConstructionOpportunity(constructionType);
CREATE INDEX IX_Opportunity_CapturedAt ON ConstructionOpportunity(capturedAt);
CREATE INDEX IX_Photo_OpportunityId ON ConstructionOpportunityPhoto(constructionOpportunityId);
CREATE INDEX IX_History_OpportunityId_CreatedAt ON ConstructionOpportunityHistory(constructionOpportunityId, createdAt);
GO
```

---

## 6) Fase B - Criar camada de conexao SQL Server na API

## 6.1 Instalar dependencia
No workspace:

```bash
npm install mssql -w @obras-prospect/api
```

## 6.2 Criar variaveis de ambiente
No `.env` da API, incluir:

```env
DB_CLIENT=sqlserver
MSSQL_HOST=SEU_SERVIDOR
MSSQL_PORT=1433
MSSQL_DATABASE=fx_obras
MSSQL_USER=seu_usuario
MSSQL_PASSWORD=sua_senha
MSSQL_ENCRYPT=false
MSSQL_TRUST_CERT=true
```

Observacao 2008 R2:
- Geralmente usar `encrypt=false` em ambiente interno.
- Ajustar conforme politica da sua rede.

## 6.3 Criar modulo de conexao
Criar arquivo sugerido:
- `apps/api/src/shared/database/sqlserver.ts`

Responsabilidades:
- criar pool unico (`ConnectionPool`)
- expor funcao `getSqlPool()`
- tratar reconnect basico e erro de conexao

---

## 7) Fase C - Substituir repositorio Prisma por repositorio SQL

## 7.1 Criar novo repositorio
Criar classe nova, por exemplo:
- `construction-opportunity.sqlserver.repository.ts`

Essa classe deve implementar a mesma interface atual do repositorio Prisma.

## 7.2 Regras obrigatorias para manter compatibilidade
1. `delete` continua soft delete (`isDeleted = 1`, `deletedAt = GETDATE()`)
2. `countByYear` deve contar inclusive deletados para nao quebrar sequencia de codigo
3. filtros de `findAll` devem ser equivalentes aos atuais
4. retornar `tags` como array (hoje no banco e JSON string)

## 7.3 Paginacao SQL Server 2008 R2
2008 R2 nao tem `OFFSET ... FETCH`.
Use `ROW_NUMBER()`:

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

## 8) Fase D - Migracao de dados SQLite -> SQL Server

## 8.1 Estrategia pratica
1. exportar SQLite para JSON/CSV por tabela
2. importar no SQL Server na ordem:
   - ConstructionOpportunity
   - ConstructionOpportunityPhoto
   - ConstructionOpportunityHistory

## 8.2 Ordem e integridade
- Primeiro tabela pai, depois filhas (por causa de FK)
- Garantir que IDs UUID sejam preservados
- Datas devem manter timezone coerente (padrao UTC)

## 8.3 Script de validacao pos-migracao
Comparar totais:
- total de obras
- total de fotos
- total de historico
- total de obras `isDeleted = 1`
- total de obras `isTest = 1`

---

## 9) Fase E - Homologacao

Checklist funcional minimo:
1. login e navegacao
2. criar obra
3. editar obra
4. excluir obra (soft delete)
5. anexar/remover foto
6. definir foto principal
7. filtros e ordenacao na listagem
8. dashboard e agregacao por status
9. abrir detalhe e historico

Checklist tecnico:
1. sem erro de conexao no log
2. tempo de resposta aceitavel
3. indices usados nas consultas principais

---

## 10) Virada para producao (runbook)

1. Avisar janela de manutencao
2. Fazer backup final do SQLite
3. Executar carga final para SQL Server
4. Trocar variaveis de ambiente para SQL Server
5. Reiniciar API
6. Rodar smoke test (criar/listar/editar/excluir/foto)
7. Liberar uso

Rollback:
1. voltar variaveis para SQLite
2. reiniciar API
3. investigar causa em homologacao antes de nova tentativa

---

## 11) Riscos e mitigacoes

Risco: query incompativel com 2008 R2
- Mitigacao: evitar sintaxe nova (OFFSET/FETCH, funcoes modernas)

Risco: regressao funcional
- Mitigacao: manter interface do repositorio identica e rodar testes de regressao

Risco: performance ruim
- Mitigacao: revisar indices e planos de execucao nas consultas de lista/dashboard

---

## 12) Definicao de pronto
Considerar migracao concluida quando:
1. API roda 100% no SQL Server 2008 R2
2. Todas as rotas principais passam no teste manual
3. Contagem de dados bate com origem
4. Time de negocio valida o uso por 1 ciclo completo

---

## 13) Proximo passo sugerido para o dev
Dia 1:
1. Criar schema no SQL Server
2. Criar conexao `mssql`
3. Implementar `findById`, `findAll`, `create`

Dia 2:
1. Implementar update/delete/count/agregacao
2. Migrar dados e validar
3. Homologar com usuario chave

Dia 3:
1. Ajuste fino de performance
2. Virada de producao com rollback pronto

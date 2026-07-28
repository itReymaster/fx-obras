# SQL Server 2008 R2 - pre-requisitos e analise de migracao

Este guia foi ajustado para o cenario real do projeto: SQL Server 2008 R2.

Objetivo:
1. dar ao dev um checklist tecnico de preparo;
2. deixar claro o que muda por ser 2008 R2;
3. orientar uma migracao segura do app (sem perda de funcionalidade).

## 1) Ponto critico do 2008 R2

Para SQL Server 2008 R2, nao assuma migracao automatica via Prisma como caminho principal.

Motivos praticos:
1. 2008 R2 e legado e tem gaps de compatibilidade com stacks atuais;
2. varias sintaxes modernas de SQL nao existem no 2008 R2 (ex.: OFFSET/FETCH);
3. migracao precisa priorizar SQL compativel e testes de regressao.

Recomendacao para avaliacao:
1. Caminho A (manter 2008 R2): usar camada de persistencia SQL nativa (mssql/Sequelize), com scripts manuais de schema;
2. Caminho B (upgrade de SQL Server): manter/retomar fluxo moderno com Prisma e migrations.

## 2) Escopo minimo da migracao

As entidades chave do app sao:
1. ConstructionOpportunity
2. ConstructionOpportunityPhoto
3. ConstructionOpportunityHistory

Os fluxos que nao podem quebrar:
1. criar/editar/excluir (soft delete) obra;
2. upload/remocao de fotos e audio;
3. filtros/listagem/dashboard;
4. historico e detalhe;
5. autoria (createdByUserId e updatedByUserId).

## 3) Pre-requisitos tecnicos (infra e banco)

Checklist obrigatorio para o DBA/dev:
1. Instancia SQL Server 2008 R2 acessivel da API (rede + firewall + porta 1433 ou porta definida).
2. Banco alvo existente e aprovado para receber o schema fx_obras.
3. Login/usuario de aplicacao com permissao no schema dedicado.
4. Backup validado antes de qualquer carga (banco alvo e base atual do app).
5. Homologacao separada de producao para ensaiar carga e rollback.

Checklist de configuracao recomendado:
1. Authentication mode habilitado conforme politica (Windows ou Mixed Mode).
2. SQL Server Browser habilitado se a conexao depende de nome de instancia.
3. Collation definida e conhecida (documentar para evitar divergencias em comparacoes).
4. Plano de manutencao de indices e estatisticas definido (job de rotina).

## 4) Script base de preparo do banco

### 4.1 Criar schema dedicado

```sql
USE [SEU_BANCO_EXISTENTE];
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.schemas
    WHERE name = 'fx_obras'
)
BEGIN
    EXEC('CREATE SCHEMA fx_obras AUTHORIZATION dbo;');
END
GO
```

### 4.2 Criar usuario do app (se necessario)

```sql
USE [SEU_BANCO_EXISTENTE];
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.database_principals
    WHERE name = 'fx_obras_app'
)
BEGIN
    CREATE USER [fx_obras_app] FOR LOGIN [fx_obras_app];
END
GO
```

### 4.3 Permissoes no schema

Opcao simples para fase de migracao/homologacao:

```sql
USE [SEU_BANCO_EXISTENTE];
GO

ALTER ROLE db_owner ADD MEMBER [fx_obras_app];
GO
```

Opcao restrita (apertar seguranca apos estabilizar):

```sql
USE [SEU_BANCO_EXISTENTE];
GO

GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::fx_obras TO [fx_obras_app];
GRANT ALTER, CONTROL ON SCHEMA::fx_obras TO [fx_obras_app];
GO
```

### 4.4 Definir schema padrao

```sql
USE [SEU_BANCO_EXISTENTE];
GO

ALTER USER [fx_obras_app] WITH DEFAULT_SCHEMA = [fx_obras];
GO
```

### 4.5 Validacao rapida

```sql
USE [SEU_BANCO_EXISTENTE];
GO

SELECT name
FROM sys.schemas
WHERE name = 'fx_obras';

SELECT name
FROM sys.database_principals
WHERE name = 'fx_obras_app';
GO
```

## 5) Regras de compatibilidade SQL 2008 R2

Durante a migracao, o dev deve seguir estas regras:
1. nao usar OFFSET/FETCH (usar ROW_NUMBER para paginacao);
2. evitar funcoes/sintaxes introduzidas em versoes mais novas;
3. padronizar tipos compativeis (NVARCHAR, BIT, DATETIME, INT, FLOAT, UNIQUEIDENTIFIER);
4. validar queries de dashboard/lista com volume real de dados;
5. criar indices para filtros principais (status, city, constructionType, capturedAt).

## 6) Estrategia de migracao recomendada

1. Preparar schema e permissoes no 2008 R2.
2. Implementar camada de dados SQL compativel em paralelo a atual.
3. Migrar dados SQLite para SQL Server em homologacao.
4. Rodar checklist funcional completo (mobile + desktop).
5. Executar virada controlada com rollback documentado.

Importante:
1. nao fazer big bang em producao sem ensaio completo;
2. manter fallback pronto para retorno rapido se houver regressao.

## 7) Criterios para aprovar a virada

A migracao so deve ser aprovada quando:
1. contagens de dados baterem entre origem e destino;
2. fluxos de captura/edicao/detalhe funcionarem sem erro;
3. filtros e dashboard estiverem equivalentes;
4. performance aceitavel nas consultas principais;
5. rollback validado em teste.

## 8) Referencia complementar deste repositorio

Para passo a passo didatico de migracao focado no 2008 R2, consulte:
1. docs/tutorial-migracao-sqlserver-2008r2.md

Para estrategia de API v2 e convivencia de camadas:
1. docs/plano-api-v2-sequelize-migracao.md

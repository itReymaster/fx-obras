# SQL Server - pre-requisitos para o app

Este guia assume que voce **ja tem um banco existente** no SQL Server e nao pode criar outro database novo.

A ideia aqui e deixar o banco pronto para o app usar um **schema dedicado**, sem misturar as tabelas do projeto com o restante do ambiente.

## O que o app precisa

O Prisma vai criar as tabelas do projeto depois da conexao ficar pronta. No banco, o minimo necessario e:

1. Um schema dedicado para o app.
2. Um usuario/login com permissao nesse schema.
3. Permissao para criar e alterar objetos dentro desse schema.

As tabelas esperadas pelo projeto sao:

1. `ConstructionOpportunity`
2. `ConstructionOpportunityPhoto`
3. `ConstructionOpportunityHistory`

## Script 1 - criar o schema do app

Execute no banco existente:

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

## Script 2 - criar usuario do app, se necessario

Use este script apenas se voce quiser um login proprio para a aplicacao. Se ja existir um login/usuario, pule esta etapa.

```sql
USE [SEU_BANCO_EXISTENTE];
GO

-- Troque os nomes abaixo pelo login real que voce vai usar.
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

> Observacao: o login de servidor precisa existir antes. Se o login ainda nao existir, ele deve ser criado no nivel do servidor por um administrador do SQL Server.

## Script 3 - permissao no schema

Se o app for criar as tabelas via Prisma migration, a forma mais simples e dar permissao de criacao e manutencao no schema.

```sql
USE [SEU_BANCO_EXISTENTE];
GO

-- Troque fx_obras_app pelo usuario real do banco
ALTER ROLE db_owner ADD MEMBER [fx_obras_app];
GO
```

Se voce quiser uma abordagem mais restrita, use permissao somente no schema:

```sql
USE [SEU_BANCO_EXISTENTE];
GO

GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::fx_obras TO [fx_obras_app];
GRANT ALTER, CONTROL ON SCHEMA::fx_obras TO [fx_obras_app];
GO
```

## Script 4 - definir schema padrao do usuario

Se o usuario do app for usar sempre o mesmo schema, vale configurar o schema padrao:

```sql
USE [SEU_BANCO_EXISTENTE];
GO

ALTER USER [fx_obras_app] WITH DEFAULT_SCHEMA = [fx_obras];
GO
```

## Script 5 - validacao

Depois de rodar os scripts, valide assim:

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

## O que nao deve ser criado manualmente

Nao crie as tabelas do app na mao se a ideia for usar Prisma. O fluxo correto e:

1. ajustar o datasource do Prisma para SQL Server;
2. apontar o `DATABASE_URL` para o banco existente;
3. rodar as migrations;
4. deixar o Prisma criar as tabelas e relacoes.

## Ordem recomendada

1. Criar o schema `fx_obras`.
2. Criar o usuario do app, se necessario.
3. Aplicar as permissoes.
4. Conectar o projeto ao SQL Server.
5. Rodar as migrations do Prisma.

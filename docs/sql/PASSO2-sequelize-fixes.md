# Passo 2 — Lacunas do Sequelize (concluido)

Correcoes feitas no codigo antes de ligar `SQL_DIALECT=mssql`:

1. **thumbnailRelativePath** — `createPhoto` no repositorio Sequelize grava a coluna; `ConstructionOpportunitiesV2Service.addPhotos` envia o path gerado pelo `fileStorage`.
2. **Fotos na listagem** — `mapPhotoRow` preserva `constructionOpportunityId` para o `groupPhotosByOpportunityId`.
3. **CRM** — leitura mapeia `crmIntegrationMessage` / `crmLastAttemptAt` para o dominio; `update` passa a persistir status, externalId, message e lastAttempt (inclui aliases do dominio).

Arquivos:
- `apps/api/src/modules/construction-opportunities/v2/construction-opportunity.sequelize.repository.ts`
- `apps/api/src/modules/construction-opportunities/v2/construction-opportunities.v2.service.ts`
- `apps/api/src/modules/construction-opportunities/repositories/construction-opportunity.repository.ts` (leitura CRM Prisma)

## Proximo

**Passo 3 (Fase B smoke):** configurar env local/homolog com `SQL_DIALECT=mssql`, validar conexao e listagem vazia/carregada.

Ainda pendente para cutover total:
- ETL SQLite -> SQL Server (112 obras / 256 fotos / 605 historicos)
- Copia de uploads do servidor
- Service providers ainda no Prisma (1 registro; vinculos 0)

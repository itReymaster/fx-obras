# Future Salesforce Integration

## Endpoint com obra completa

Use `GET /api/v1/construction-opportunities/:id` para consultar dados completos de cadastro, endereco, coordenadas, imagens, historico e campos comerciais.

## Payload de exportacao

Use `GET /api/v1/construction-opportunities/:id/export`.

Esse endpoint retorna um contrato estavel com:

- `schemaVersion`
- `sourceSystem`
- `generatedAt`
- `constructionOpportunity` com blocos `address`, `contact`, `commercial`, `photos`, `notes`, `tags`

O contrato e produzido por `ConstructionOpportunityExportMapper` em:

- `apps/api/src/modules/construction-opportunities/mappers/construction-opportunity-export.mapper.ts`

## Campos preparados para integracao

- `crmIntegrationStatus`: `NOT_SENT | PENDING | SENT | ERROR`
- `crmExternalId`
- `crmLastAttemptAt`
- `crmIntegrationMessage`

## Como criar SalesforceCrmIntegrationService

1. Implementar interface `CrmIntegrationService` em:
   - `apps/api/src/shared/integrations/crm/crm-integration-service.ts`
2. Criar nova classe `SalesforceCrmIntegrationService` com autenticacao OAuth e envio para objeto de destino.
3. Substituir injecao no service de oportunidades mantendo o dominio desacoplado.

## Persistencia do ID externo

Salvar `crmExternalId` com valor retornado pelo Salesforce apos envio bem-sucedido.

## Tratamento de erros e novas tentativas

- Atualizar `crmIntegrationStatus` para `ERROR`
- Persistir mensagem em `crmIntegrationMessage`
- Registrar tentativa no historico com acao `CRM_INTEGRATION_ATTEMPT`
- Reexecutar envio por endpoint `POST /api/v1/construction-opportunities/:id/integrations/crm`

## Fotografias no Salesforce (futuro)

Estratégias sugeridas:

- Enviar URLs assinadas dos arquivos para relacionamento externo
- Upload como arquivos no Salesforce e vinculo via External ID
- Guardar mapping local entre `photo.id` e `contentDocumentId`

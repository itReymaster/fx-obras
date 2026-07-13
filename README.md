# Obras Prospect MVP

MVP web para captura de oportunidades de obras com API REST versionada, SQLite local, upload de imagens e front-end mobile-first.

## Stack

- Back-end: Node.js, TypeScript, Express, Prisma, SQLite, Zod, Multer, Swagger
- Front-end: React, TypeScript, Vite, React Router, React Hook Form, Zod, Axios, Lucide

## Estrutura

/apps
- /api: API REST e banco SQLite
- /web: Aplicacao React mobile-first

/packages
- /shared-types: Tipos compartilhados do dominio

/docs
- /future-salesforce-integration.md

## Configuracao

1. Instale dependencias:

```bash
npm install
```

2. Copie e ajuste variaveis da API (ja existe exemplo em apps/api/.env.example):

- PORT
- DATABASE_URL
- CORS_ORIGIN
- UPLOAD_DIR
- MAX_PHOTOS_PER_OPPORTUNITY
- MAX_PHOTO_SIZE_MB

3. Gere cliente Prisma, aplique migration e seed:

```bash
npm run prisma:generate -w @obras-prospect/api
npm run prisma:migrate -w @obras-prospect/api -- --name init
npm run prisma:seed -w @obras-prospect/api
```

## Execucao

Terminal 1 (API):

```bash
npm run dev:api
```

Terminal 2 (Web):

```bash
npm run dev:web
```

## Endpoints principais

Base: `/api/v1`

- `POST /construction-opportunities`
- `GET /construction-opportunities`
- `GET /construction-opportunities/:id`
- `GET /construction-opportunities/:id/export`
- `PUT/PATCH /construction-opportunities/:id`
- `DELETE /construction-opportunities/:id` (soft delete)
- `POST /construction-opportunities/:id/photos`
- `DELETE /construction-opportunities/:id/photos/:photoId`
- `PATCH /construction-opportunities/:id/photos/:photoId/primary`
- `GET /construction-opportunities/:id/history`
- `PATCH /construction-opportunities/:id/status`
- `GET /construction-opportunities/dashboard`
- `POST /construction-opportunities/:id/integrations/crm`

Swagger:

- `http://localhost:3333/docs`

## Fluxo de captura

1. Localizacao e endereco (GPS ou manual)
2. Fotografias (camera/galeria, multiplas, foto principal)
3. Informacoes gerais
4. Revisao e confirmacao
5. Sucesso com codigo da obra

## Testes

```bash
npm run test -w @obras-prospect/api
```

Cobertura basica implementada para criacao, validacao, GPS/manual, upload, filtros, consulta, export, status e exclusao logica.

## Troca futura de SQLite

A camada Prisma centraliza persistencia em `apps/api/prisma/schema.prisma` e `apps/api/src/shared/database/prisma.ts`. Para migrar de SQLite para outro banco, ajuste datasource + migration e mantenha contratos da API.

# 📋 Guia de Deploy para Produção

URL: `https://projetos.reymaster.com.br:17443/inovacao/fx-obras/`

---

## 🔧 Configuração Necessária

### 1. Criar `.env.production` na pasta `apps/web/`

```bash
# apps/web/.env.production

# Configuração do caminho base (subdiretório)
VITE_BASE_PATH=/inovacao/fx-obras/

# URLs da API
VITE_API_BASE_URL=https://projetos.reymaster.com.br:17443/api/v1
VITE_UPLOADS_BASE_URL=https://projetos.reymaster.com.br:17443

# App Info
VITE_APP_NAME=Digital Rey
VITE_APP_MODULE_NAME=Prospecção de Obras
```

### 2. Verificar `vite.config.ts`

Confirmar que usa variáveis de ambiente:
```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const basePath = env.VITE_BASE_PATH || "/";

  return {
    base: basePath,
    // ... resto da config
  };
});
```

✅ **Status**: Já configurado corretamente

### 3. Build para Produção

```bash
# Na raiz do projeto
npm run build -w web

# Isso gera a pasta: apps/web/dist/
```

**Resultado esperado:**
- ✅ 0 TypeScript errors
- ✅ Arquivos otimizados em `dist/`
- ✅ Base path correto nos arquivos HTML/JS

---

## 📦 API em Produção

**Verificações Necessárias:**

- [ ] API rodando em `https://projetos.reymaster.com.br:17443/api/v1`
- [ ] Endpoints:
  - `GET /api/v1/construction-opportunities` (listar)
  - `GET /api/v1/construction-opportunities/:id` (detalhe)
  - `PUT /api/v1/construction-opportunities/:id` (atualizar)
  - `POST /api/v1/construction-opportunities` (criar)
  - `POST /api/v1/construction-opportunities/:id/photos` (upload fotos)
- [ ] CORS configurado para aceitar requests de `https://projetos.reymaster.com.br:17443`
- [ ] Certificado SSL válido (não auto-assinado)

**Express CORS Config Necessária:**

```typescript
// apps/api/src/app.ts
app.use(cors({
  origin: [
    'https://projetos.reymaster.com.br:17443',
    process.env.CORS_ORIGIN || '*'
  ],
  credentials: true
}));
```

---

## 📸 Upload de Imagens

**Verificações:**

- [ ] Endpoint de upload: `POST /api/v1/construction-opportunities/:id/photos`
- [ ] Path de uploads: `https://projetos.reymaster.com.br:17443/uploads/construction-opportunities/{uuid}.jpg`
- [ ] Pasta de uploads com permissão de escrita
- [ ] Multer configurado com limite > 10MB (máx 5 fotos)

**No código (já configurado):**
```typescript
// apps/web/src/features/construction-opportunities/services/opportunities-api.ts
uploadsBaseUrl: import.meta.env.VITE_UPLOADS_BASE_URL ?? origin
```

---

## 🗺️ GPS/Geolocalização

**Verificações:**

- [ ] HTTPS ativado (browser requer HTTPS para acesso a GPS) ✅
- [ ] Endpoint Nominatim acessível: `https://nominatim.openstreetmap.org/`
- [ ] Permissão de geolocalização no navegador (browser pede automaticamente)

**Não requer mudanças** - já configurado:
```typescript
// apps/api/src/shared/geolocation/geocoding-service.ts
const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
```

---

## 🔐 Certificado SSL

**Verificações:**

- [ ] Certificado válido (não auto-assinado)
- [ ] Certificado abrange domínio `projetos.reymaster.com.br`
- [ ] Porta 17443 está aberta e roteável
- [ ] Certificate chain completo instalado

---

## ✅ Checklist de Deploy

### Antes do Build
- [ ] Clonar repositório no servidor
- [ ] Instalar dependencies: `npm install`
- [ ] Criar `.env.production` em `apps/web/`
- [ ] Verificar credenciais de API
- [ ] Confirmar URLs corretas

### Build
```bash
npm run build -w web
# Deve terminar com: ✓ built in XXms
```

- [ ] Build completa sem erros
- [ ] Pasta `apps/web/dist/` existe
- [ ] Arquivos otimizados estão presentes

### Deploy
- [ ] Copiar conteúdo de `apps/web/dist/` para servidor web
  - Apache: `/var/www/html/inovacao/fx-obras/`
  - Nginx: `/usr/share/nginx/html/inovacao/fx-obras/`
  - Ou servir via Node.js/Express estático
- [ ] Configurar trailing slash / rewrite para SPA
- [ ] Confirmar certificado SSL

### Verificação em Produção
```bash
# Testar URLs
curl https://projetos.reymaster.com.br:17443/inovacao/fx-obras/
curl https://projetos.reymaster.com.br:17443/api/v1/construction-opportunities
```

- [ ] HTML carrega corretamente
- [ ] Assets (CSS/JS) carregam
- [ ] API responde
- [ ] Login funciona
- [ ] GPS funciona (testar no celular)
- [ ] Criar registro com foto funciona
- [ ] Atualizar dados funciona

---

## 🚨 Possíveis Problemas e Soluções

### Problema: "Cannot GET /inovacao/fx-obras/"
**Solução**: Servidor precisa reescrever todas as rotas para `index.html` (SPA)

**Nginx:**
```nginx
location /inovacao/fx-obras/ {
  try_files $uri $uri/ /inovacao/fx-obras/index.html;
}
```

**Apache:**
```apache
<Directory /var/www/html/inovacao/fx-obras>
  RewriteEngine On
  RewriteBase /inovacao/fx-obras/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /inovacao/fx-obras/index.html [L]
</Directory>
```

### Problema: "API request failed" / CORS error
**Solução**: Verificar CORS no Express:
```typescript
app.use(cors({
  origin: 'https://projetos.reymaster.com.br:17443',
  credentials: true
}));
```

### Problema: "Cannot access GPS location"
**Solução**: 
- [ ] Confirmar HTTPS ativo
- [ ] Browser pedirá permissão (aceitar)
- [ ] Se recusar, browser não envia coordenadas

### Problema: "Upload de fotos não funciona"
**Solução**:
- [ ] Verificar permissão de pasta uploads
- [ ] Checar limite de tamanho de arquivo
- [ ] Verificar URL de base para imagens

---

## 📝 Estrutura de Pastas em Produção

```
/var/www/html/inovacao/fx-obras/
├── index.html
├── assets/
│   ├── index-XXXX.js
│   ├── index-XXXX.css
│   └── ...
└── manifest.webmanifest

/api/v1/
└── construction-opportunities/
    └── (gerenciada pela API em produção)

/uploads/construction-opportunities/
└── {uuid}.jpg (gerenciada pela API)
```

---

## 🔄 Atualizações Futuras

Quando precisar fazer updates:

```bash
# 1. Pull código novo
git pull origin main

# 2. Instalar dependências novas (se houver)
npm install

# 3. Build
npm run build -w web

# 4. Copiar apenas `dist/` para servidor
cp -r apps/web/dist/* /var/www/html/inovacao/fx-obras/

# 5. Limpar cache do navegador (pode ser automático com hash nos arquivos)
```

---

## 📞 Suporte

Se der erro, coletar:
- [ ] URL exata onde deu erro
- [ ] Console do navegador (F12 > Console)
- [ ] Network tab (F12 > Network)
- [ ] Status HTTP das requisições
- [ ] Mensagens de erro específicas


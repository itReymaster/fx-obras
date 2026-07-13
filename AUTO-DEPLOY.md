# 🚀 Deploy Automático - Zero Configuração

## ✨ Mudança Importante

O app agora detecta **automaticamente** o ambiente (localhost, rede local, produção) **em runtime**. 

**Não precisa mais de `.env.production` ou variáveis de build!**

---

## 🎯 Como Funciona

### App Config Inteligente

```typescript
// apps/web/src/config/app.ts
function getApiBaseUrl(): string {
  return "/api/v1";  // Sempre relativo!
}

function getUploadsBaseUrl(): string {
  return window.location.origin;  // Detecta hostname em runtime
}
```

### Rotas Relativamente

- API: `/api/v1` → Proxy do servidor roteia para backend
- Uploads: `/uploads/...` → Proxy do servidor roteia para backend
- Frontend: `/` → Vite serve normalmente

---

## 📦 Deploy Simplificado

### Antes (com .env.production)
```bash
VITE_BASE_PATH=/inovacao/fx-obras/
VITE_API_BASE_URL=https://projetos.reymaster.com.br:17443/api/v1
VITE_UPLOADS_BASE_URL=https://projetos.reymaster.com.br:17443
# ❌ Precisa de arquivo de config
```

### Agora (automático)
```bash
npm run build -w web
# ✅ Uma linha! Funciona em qualquer lugar
```

---

## 🔄 Funcionamento em Diferentes Ambientes

| Ambiente | URL | API | Uploads |
|----------|-----|-----|---------|
| **Local Dev** | http://localhost:5175/ | /api/v1 | http://localhost:5175 |
| **Rede Local** | https://192.168.15.7:5175/ | /api/v1 | https://192.168.15.7:5175 |
| **Produção** | https://projetos.reymaster.com.br:17443/inovacao/fx-obras/ | /api/v1 | https://projetos.reymaster.com.br:17443 |

**Em todos os casos:**
- App carrega em `/`
- API roteia de `/api/v1` para backend
- Uploads roteia de `/uploads/` para backend

---

## 📋 Checklist Simplificado para Deploy

```bash
# 1. Clone e instale
git clone <REPO> /opt/fx-obras
cd /opt/fx-obras
npm install

# 2. Build (sem .env.production!)
npm run build -w web

# 3. Servir (Nginx/Apache/Express)
# Configurar para:
# - Servir apps/web/dist/ em /
# - Proxy /api/* → http://localhost:3333/api/*
# - Proxy /uploads/* → http://localhost:3333/uploads/*
# - Rewrite 404 para index.html (SPA)

# Pronto! ✅
```

---

## 🔧 Configuração do Servidor (Produção)

### Nginx

```nginx
server {
    listen 17443 ssl http2;
    server_name projetos.reymaster.com.br;
    
    ssl_certificate ...;
    ssl_certificate_key ...;
    
    # SPA Static Files
    location /inovacao/fx-obras/ {
        alias /opt/fx-obras/apps/web/dist/;
        try_files $uri $uri/ /inovacao/fx-obras/index.html;
    }
    
    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3333;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Uploads Proxy
    location /uploads/ {
        proxy_pass http://localhost:3333;
    }
}
```

### Apache

```apache
<VirtualHost *:17443>
    ServerName projetos.reymaster.com.br
    DocumentRoot /opt/fx-obras/apps/web/dist
    
    SSLEngine on
    SSLCertificateFile ...;
    SSLCertificateKeyFile ...;
    
    <Directory /opt/fx-obras/apps/web/dist>
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    ProxyPass /api/ http://localhost:3333/api/
    ProxyPassReverse /api/ http://localhost:3333/api/
    
    ProxyPass /uploads/ http://localhost:3333/uploads/
    ProxyPassReverse /uploads/ http://localhost:3333/uploads/
</VirtualHost>
```

---

## ✅ Vantagens da Nova Abordagem

| Aspecto | Antes | Agora |
|--------|-------|-------|
| **Config por ambiente** | 3 `.env` diferentes | 1 build para todos |
| **Tempo de setup** | 30 minutos | 5 minutos |
| **Risk de erro** | Alto (configs divergentes) | Baixo (mesmo build) |
| **Deploy** | Manual pro cada env | Automático |
| **Manutenção** | Complexa | Simples |

---

## 🔍 Como Isso Funciona Tecnicamente

### Runtime Detection

```typescript
// A app detecta automaticamente:
- window.location.origin → Host/porta atual
- window.location.pathname → Path atual
- API sempre em /api/v1 (proxy faz a rota)
```

### Exemplo de Requisição

```
Navegador: https://projetos.reymaster.com.br:17443/inovacao/fx-obras/
          ↓
      [Nginx]
          ↓
Aplicação React: https://projetos.reymaster.com.br:17443/inovacao/fx-obras/
          ↓
Faz request: GET /api/v1/construction-opportunities
          ↓
      [Nginx Proxy]
          ↓
API Response: http://localhost:3333/api/v1/construction-opportunities
```

---

## 📝 Atualizar .env.production (opcional)

Se ainda quiser usar `.env.production` para nome da app:

```bash
VITE_APP_NAME=Digital Rey
VITE_APP_MODULE_NAME=Prospecção de Obras
```

Mas não é mais necessário! O build funciona sem isso também.

---

## 🎉 Deploy no GitHub

Agora o proceso é super simples:

```bash
# 1. No servidor
git pull origin main

# 2. Build (uma linha!)
npm run build -w web

# 3. Copy para web server
cp -r apps/web/dist/* /var/www/html/inovacao/fx-obras/

# Feito! ✅
```

Sem surpresas, sem configurações esquisitas, sem erros de deploy!


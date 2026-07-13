# 🚀 Instrções de Deploy para o Time

## 📌 Resumo

O app será publicado em: `https://projetos.reymaster.com.br:17443/inovacao/fx-obras/`

**Funcionalidades críticas que devem funcionar:**
- ✅ Login com autenticação
- ✅ Listar, criar e editar registros de oportunidades de obra
- ✅ Upload de múltiplas fotos (até 5, máx 10MB cada)
- ✅ GPS/Geolocalização automática
- ✅ Busca e filtros

---

## 📋 Checklist de Configuração

### 1. **Antes de Fazer Push para GitHub**

```bash
# Verificar que o build funciona localmente
npm run build -w web

# Deve terminar com: ✓ built in XXms
# Se der erro, NÃO fazer push até corrigir
```

### 2. **No Servidor de Produção**

#### A. Clonar e Preparar

```bash
# Clonar repositório
git clone <URL-REPOSITORIO> /opt/fx-obras
cd /opt/fx-obras

# Instalar dependências
npm install

# O arquivo .env.production já deve estar em apps/web/
# (foi commitado no repositório)
```

#### B. Verificar Configuração de Produção

```bash
# Verificar que .env.production existe e está correto
cat apps/web/.env.production
```

Deve conter:
```
VITE_BASE_PATH=/inovacao/fx-obras/
VITE_API_BASE_URL=https://projetos.reymaster.com.br:17443/api/v1
VITE_UPLOADS_BASE_URL=https://projetos.reymaster.com.br:17443
```

#### C. Build para Produção

```bash
# Build otimizado
npm run build -w web

# Verifica se compilou sem erros
echo $? # deve retornar 0
```

#### D. Servir os Arquivos

**Opção 1: Nginx (Recomendado)**

```nginx
server {
    listen 17443 ssl http2;
    server_name projetos.reymaster.com.br;
    
    # Certificados SSL
    ssl_certificate /etc/ssl/certs/projetos.reymaster.com.br.crt;
    ssl_certificate_key /etc/ssl/private/projetos.reymaster.com.br.key;
    
    # Servir SPA
    location /inovacao/fx-obras/ {
        alias /opt/fx-obras/apps/web/dist/;
        try_files $uri $uri/ /index.html;
        
        # Cache assets
        location ~ \.(js|css|png|jpg|jpeg|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Proxy para API
    location /api/ {
        proxy_pass http://localhost:3333;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Proxy para uploads
    location /uploads/ {
        proxy_pass http://localhost:3333;
        proxy_set_header Host $host;
    }
}
```

**Opção 2: Apache**

```apache
<VirtualHost *:17443>
    ServerName projetos.reymaster.com.br
    
    # SSL
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/projetos.reymaster.com.br.crt
    SSLCertificateKeyFile /etc/ssl/private/projetos.reymaster.com.br.key
    
    # SPA
    DocumentRoot /opt/fx-obras/apps/web/dist
    
    <Directory /opt/fx-obras/apps/web/dist>
        RewriteEngine On
        RewriteBase /inovacao/fx-obras/
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /inovacao/fx-obras/index.html [L]
    </Directory>
    
    # API Proxy
    ProxyPass /api/ http://localhost:3333/api/
    ProxyPassReverse /api/ http://localhost:3333/api/
    
    # Uploads Proxy
    ProxyPass /uploads/ http://localhost:3333/uploads/
    ProxyPassReverse /uploads/ http://localhost:3333/uploads/
</VirtualHost>
```

#### E. API em Produção

A API deve estar rodando:

```bash
# Em outro terminal/processo
cd /opt/fx-obras/apps/api
npm install
npm run build  # Se houver
npm start      # ou npm run start (não dev!)
```

**Verificar que API responde:**
```bash
curl https://projetos.reymaster.com.br:17443/api/v1/construction-opportunities
# Deve retornar JSON com lista de oportunidades
```

---

## 🧪 Testes Após Deploy

### No Desktop
1. Abrir `https://projetos.reymaster.com.br:17443/inovacao/fx-obras/`
2. Login: `adm` / `123@mudar`
3. Verificar:
   - [ ] Página carrega
   - [ ] Lista de oportunidades aparece
   - [ ] Pode clicar em detalhes
   - [ ] Fotos aparecem

### No Celular
1. Conectar à mesma rede (ou via internet)
2. Abrir `https://projetos.reymaster.com.br:17443/inovacao/fx-obras/`
3. Aceitar aviso de certificado (se houver)
4. Login
5. Verificar:
   - [ ] Interface responsiva funciona
   - [ ] GPS funciona (tenta capturar localização)
   - [ ] Pode capturar foto e enviar

---

## 🆘 Troubleshooting

### Problema: "Cannot GET /inovacao/fx-obras/"
**Causa**: Servidor não está reescrevendo rotas para `index.html`  
**Solução**: Verificar configuração de Nginx/Apache acima

### Problema: "API request failed"
**Causa**: API não está acessível ou CORS não configurado  
**Solução**: 
```bash
# Testar acesso à API
curl https://projetos.reymaster.com.br:17443/api/v1/construction-opportunities -v

# Verificar CORS no Express (apps/api/src/app.ts)
app.use(cors({
  origin: 'https://projetos.reymaster.com.br:17443',
  credentials: true
}));
```

### Problema: "GPS não funciona"
**Causa**: Não é HTTPS ou permissão negada  
**Solução**: 
- Verificar que URL usa HTTPS
- No celular, conceder permissão de localização quando pedir

### Problema: "Fotos não carregam"
**Causa**: URL de upload incorreta ou pasta sem permissão  
**Solução**:
- Verificar `VITE_UPLOADS_BASE_URL` em `.env.production`
- Verificar permissões de pasta: `chmod 755 /opt/fx-obras/apps/api/uploads`

---

## 📞 Contato

Se der problema durante deploy, coletar:
- [ ] URL exata onde erro ocorre
- [ ] Mensagem de erro do console (F12 > Console)
- [ ] Status HTTP (F12 > Network)
- [ ] Log do servidor (docker/systemd logs)


# Setup de Certificado HTTPS para Rede Interna

## Objetivo
Criar certificado SSL confiável para testar geolocalização e captura de endereço na rede interna.

## Pré-requisitos
O certificado é necessário porque:
- Geolocalização (Geolocation API) requer HTTPS em redes remotas
- Acesso à câmera/microfone requer contexto seguro (HTTPS)
- APIs modernas de segurança exigem HTTPS fora de localhost

## Opção 1: Usando mkcert (Recomendado)

### 1. Instalar mkcert
```powershell
# Windows com Chocolatey
choco install mkcert

# OU com npm
npm install -g mkcert
```

### 2. Executar script de setup
```powershell
cd c:\Gestão\Obras\fx-obras
.\scripts\setup-https.ps1
```

Este script irá:
- Criar CA local confiável (instalará no Windows)
- Gerar certificados para localhost e rede interna
- Salvar em `./certs/cert.pem` e `./certs/key.pem`

### 3. Reiniciar dev server
```powershell
npm run dev -w web
```

## Opção 2: Usando OpenSSL (Manual)

```powershell
# 1. Criar diretório
mkdir certs
cd certs

# 2. Gerar chave privada
openssl genrsa -out key.pem 2048

# 3. Gerar certificado auto-assinado
openssl req -new -x509 -key key.pem -out cert.pem -days 365 `
  -subj "/CN=localhost"

# 4. Confiar no certificado no Windows
# Abrir PowerShell como Admin e rodar:
Import-Certificate -FilePath ".\cert.pem" -CertStoreLocation "Cert:\LocalMachine\Root"
```

## Usando na rede interna

Após gerar os certificados:

### Acessar de outro PC na rede
```
https://[SEU_IP]:5175
# Exemplo: https://192.168.1.100:5175
```

### Encontrar seu IP local
```powershell
ipconfig

# Procure por "IPv4 Address" na seção da sua rede
# Exemplo: 192.168.1.100
```

## Testando Geolocalização

Depois de acessar via HTTPS:
1. Abra DevTools (F12)
2. Vá para Console
3. Execute:
```javascript
navigator.geolocation.getCurrentPosition(
  pos => console.log(pos),
  err => console.error(err)
);
```

Permita acesso à localização do navegador. A coordenada será capturada.

## Removendo Certificado (se necessário)

```powershell
# Windows - abrir Gerenciador de Certificados
certmgr.msc

# Localize em: Autoridades de Certificação Raiz Confiáveis
# Procure por "mkcert"
# Clique com botão direito > Deletar
```

## Troubleshooting

### Erro: "Host/Port already in use"
```powershell
# Encontrar processo usando porta 5175
netstat -ano | findstr :5175

# Matar processo
taskkill /PID [PID] /F
```

### Certificado não é reconhecido
- Verifique se está em HTTPS (URL deve começar com https://)
- Reinicie o navegador
- Limpe cache (Ctrl+Shift+Del)

### Erro de CORS com API
- API também precisa estar em HTTPS se web está em HTTPS
- Ou usar proxy do Vite (já configurado em vite.config.ts)

## Arquivos gerados
```
certs/
  ├── cert.pem      (Certificado público)
  └── key.pem       (Chave privada - NÃO compartilhar)
```

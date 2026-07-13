# Script para setup de certificado HTTPS local
# Requer: mkcert (npm install -g mkcert) ou chocolatey install mkcert

$CertDir = ".\certs"
$CertName = "localhost"

# Criar diretório de certificados
if (-not (Test-Path $CertDir)) {
    New-Item -ItemType Directory -Path $CertDir | Out-Null
    Write-Host "Diretório $CertDir criado" -ForegroundColor Green
}

# Verificar se mkcert está instalado
$mkcertPath = Get-Command mkcert -ErrorAction SilentlyContinue

if (-not $mkcertPath) {
    Write-Host "⚠️  mkcert não encontrado!" -ForegroundColor Yellow
    Write-Host "Instale com: choco install mkcert" -ForegroundColor Yellow
    Write-Host "Ou: npm install -g mkcert" -ForegroundColor Yellow
    exit 1
}

# Criar local CA se não existir
Write-Host "Configurando Local CA..." -ForegroundColor Cyan
mkcert -install

# Gerar certificado para localhost e IPs da rede local
Write-Host "Gerando certificado para localhost..." -ForegroundColor Cyan
mkcert -cert-file "$CertDir\cert.pem" -key-file "$CertDir\key.pem" `
    localhost `
    127.0.0.1 `
    ::1 `
    *.local `
    192.168.0.0/16 `
    10.0.0.0/8 `
    172.16.0.0/12

Write-Host "✅ Certificados criados em: $CertDir" -ForegroundColor Green
Write-Host "📝 Certificado: $CertDir\cert.pem" -ForegroundColor Green
Write-Host "🔑 Chave privada: $CertDir\key.pem" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "O certificado é confiável no navegador e sistema Windows!" -ForegroundColor Green

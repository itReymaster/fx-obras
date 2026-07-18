param(
    [string]$StatusUrl = "https://projetos.reymaster.com.br:17443/inovacao/fx-obras/api/v2/auth/erp-flex/status",
    [string]$LoginUrl = "https://projetos.reymaster.com.br:17443/inovacao/fx-obras/api/v2/auth/erp-flex",
    [string]$TestUsername,
    [string]$TestPassword
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Fail {
    param([string]$Message)
    Write-Host "`nERRO: $Message" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".\docker-compose.yml")) {
    Fail "Execute este script na raiz do projeto, onde existe o arquivo docker-compose.yml."
}

$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCommand) {
    Fail "Docker nao esta disponivel neste ambiente. Rode este script no servidor que publica a aplicacao."
}

if (-not (Test-Path ".\.env")) {
    Fail "Arquivo .env da raiz nao encontrado. Ele precisa conter DB_PASSWORD ou ERP_FLEX_SQLSERVER_PASSWORD."
}

$rootEnv = Get-Content ".\.env" -Raw
$hasDbPassword = $rootEnv -match "(?m)^DB_PASSWORD\s*=\s*.+$"
$hasErpPassword = $rootEnv -match "(?m)^ERP_FLEX_SQLSERVER_PASSWORD\s*=\s*.+$"

if (-not $hasDbPassword -and -not $hasErpPassword) {
    Fail "Nenhuma senha do ERP Flex foi encontrada no .env da raiz. Configure DB_PASSWORD ou ERP_FLEX_SQLSERVER_PASSWORD."
}

Write-Step "Subindo backend com rebuild"
docker compose up -d --build backend
if ($LASTEXITCODE -ne 0) {
    Fail "docker compose up -d --build backend falhou."
}

Write-Step "Consultando status do ERP Flex"
try {
    $statusResponse = Invoke-RestMethod -Method Get -Uri $StatusUrl
    $statusResponse | ConvertTo-Json -Depth 5 | Write-Host
} catch {
    Fail "Nao foi possivel consultar $StatusUrl. $_"
}

if (-not $statusResponse.configured) {
    Fail "O backend publicado ainda esta sem senha carregada para o ERP Flex (configured=false)."
}

if ($TestUsername -and $TestPassword) {
    Write-Step "Testando login ERP Flex"
    $body = @{ username = $TestUsername; password = $TestPassword } | ConvertTo-Json

    try {
        $loginResponse = Invoke-RestMethod -Method Post -Uri $LoginUrl -ContentType "application/json" -Body $body
        $loginResponse | ConvertTo-Json -Depth 5 | Write-Host
    } catch {
        Fail "O endpoint respondeu, mas o login ERP Flex falhou. $_"
    }
} else {
    Write-Host "`nLogin ERP Flex nao testado automaticamente." -ForegroundColor Yellow
    Write-Host "Para testar no script, rode com -TestUsername e -TestPassword." -ForegroundColor Yellow
}

Write-Host "`nBackend publicado e validado com sucesso." -ForegroundColor Green
# Script para configurar hostname fx-obras.local para acesso na rede
# Requer privilégios de administrador

# Verificar se está rodando como admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")

if (-not $isAdmin) {
    Write-Host "❌ Este script requer privilégios de administrador"
    Write-Host "   Clique com botão direito no PowerShell e selecione 'Executar como administrador'"
    exit 1
}

$hostsFile = "C:\Windows\System32\drivers\etc\hosts"
$hostname = "fx-obras.local"
$ipAddress = "127.0.0.1"

Write-Host "🔧 Configurando hostname para acesso em rede..."
Write-Host "   Hostname: $hostname"
Write-Host "   IP: $ipAddress"
Write-Host ""

# Ler conteúdo do arquivo hosts
$hostsContent = Get-Content -Path $hostsFile -Raw

# Verificar se já existe entrada
$entryExists = $hostsContent -match [regex]::Escape($hostname)

if ($entryExists) {
    Write-Host "✅ Entrada '$hostname' já existe no arquivo hosts"
    Write-Host ""
    Write-Host "📝 Conteúdo atual:"
    Get-Content $hostsFile | Select-String $hostname
}
else {
    Write-Host "📝 Adicionando entrada ao arquivo hosts..."
    
    # Criar backup
    $backup = $hostsFile + ".backup"
    Copy-Item -Path $hostsFile -Destination $backup -Force
    Write-Host "   Backup criado: $backup"
    
    # Adicionar nova entrada
    Add-Content -Path $hostsFile -Value "`n$ipAddress    $hostname" -Encoding UTF8
    
    Write-Host "✅ Entrada adicionada com sucesso!"
    Write-Host ""
    Write-Host "📝 Nova entrada:"
    Get-Content $hostsFile | Select-String $hostname
}

Write-Host ""
Write-Host "🌐 URL agora disponível:"
Write-Host "   https://$hostname:5178/"
Write-Host ""
Write-Host "💡 Próximas etapas:"
Write-Host "   1. Inicie o servidor: npm run dev:web"
Write-Host "   2. Acesse de outro device: https://$hostname:5178/"
Write-Host "   3. Ou localmente: https://localhost:5178/"

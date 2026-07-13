param([switch]$Admin)

if (-not $Admin) {
    $scriptPath = $MyInvocation.MyCommand.Path
    $args = "-Admin"
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" $args" -Verb RunAs
    exit
}

$hostsFile = "C:\Windows\System32\drivers\etc\hosts"
$hostname = "fx-obras.local"
$ipAddress = "127.0.0.1"
$entry = "$ipAddress    $hostname"

Write-Host "🔧 Configurando $hostname..." -ForegroundColor Cyan

$content = Get-Content $hostsFile

if ($content | Select-String -Pattern $hostname -SimpleMatch -Quiet) {
    Write-Host "✅ Entrada já existe" -ForegroundColor Green
} else {
    Write-Host "📝 Adicionando entrada..." -ForegroundColor Yellow
    Copy-Item $hostsFile "$hostsFile.backup" -Force
    Add-Content -Path $hostsFile -Value "`n$entry" -Encoding UTF8
    Write-Host "✅ Adicionado com sucesso!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🌐 URL disponível:" -ForegroundColor Cyan
Write-Host "   https://$hostname:5178/" -ForegroundColor White

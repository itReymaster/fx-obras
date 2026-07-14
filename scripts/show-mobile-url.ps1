param(
    [int]$Port = 5175
)

$hostname = $env:COMPUTERNAME

$activeAdapter = Get-NetIPConfiguration |
    Where-Object {
        $_.IPv4Address -and
        $_.IPv4DefaultGateway -and
        $_.IPv4Address.IPAddress -notlike '169.254.*' -and
        $_.IPv4Address.IPAddress -ne '127.0.0.1'
    } |
    Select-Object -First 1

$ipv4 = if ($activeAdapter) { $activeAdapter.IPv4Address.IPAddress } else { $null }

$dnsSuffix = if ($activeAdapter) {
    (Get-DnsClient |
        Where-Object {
            $_.InterfaceAlias -eq $activeAdapter.InterfaceAlias -and
            $_.ConnectionSpecificSuffix
        } |
        Select-Object -First 1 -ExpandProperty ConnectionSpecificSuffix)
} else {
    $null
}

$stableUrl = "http://${hostname}:$Port"
$fqdnUrl = if ($dnsSuffix) { "http://${hostname}.${dnsSuffix}:$Port" } else { $null }
$fallbackUrl = if ($ipv4) { "http://${ipv4}:$Port" } else { $null }

Write-Host "URL para teste no celular (mesma rede)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Preferencial (hostname):" -ForegroundColor Green
Write-Host "  $stableUrl"

if ($fqdnUrl) {
    Write-Host ""
    Write-Host "Preferencial em redes corporativas (FQDN):" -ForegroundColor Green
    Write-Host "  $fqdnUrl"
}

if ($fallbackUrl) {
    Write-Host ""
    Write-Host "Fallback (IP):" -ForegroundColor Yellow
    Write-Host "  $fallbackUrl"
}

Write-Host ""
Write-Host "Requisitos:" -ForegroundColor Cyan
Write-Host "  1) Rodar: npm run dev:api"
Write-Host "  2) Rodar: npm run dev:web"
Write-Host "  3) Liberar porta $Port no Firewall do Windows se necessario"

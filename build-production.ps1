#!/usr/bin/env pwsh
<#
  Script de Build para Produção
  Uso: .\build-production.ps1
#>

Write-Host "🏗️ Build para Produção - FX-Obras" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos na raiz do projeto
if (!(Test-Path "apps/web/.env.production")) {
  Write-Host "❌ Erro: .env.production não encontrado em apps/web/" -ForegroundColor Red
  Write-Host "Criando arquivo padrão..." -ForegroundColor Yellow
  Copy-Item "apps/web/.env.production.example" "apps/web/.env.production" -ErrorAction SilentlyContinue
}

Write-Host "✅ Instalando dependências..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Erro ao instalar dependências" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "✅ Compilando TypeScript..." -ForegroundColor Green
npm run build -w web
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Erro no build" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📂 Arquivos prontos para deploy em:" -ForegroundColor Cyan
Write-Host "   apps/web/dist/" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Copiar conteúdo de apps/web/dist/ para o servidor"
Write-Host "   2. Configurar servidor web (Nginx/Apache) para servir como SPA"
Write-Host "   3. Testar em: https://projetos.reymaster.com.br:17443/inovacao/fx-obras/" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 Veja DEPLOYMENT.md para mais detalhes" -ForegroundColor Cyan

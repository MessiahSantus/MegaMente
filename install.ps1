# Script de Instalação Unificada do MegaMente
# Para executar, abra o PowerShell e digite: .\install.ps1

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Inicializando a instalacao do MegaMente  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Instalação das dependências Node.js via NPM Workspaces
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "`n[1/3] Instalando dependencias Node.js (gbrain e mi4uu-brain)..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "`n[1/3] AVISO: 'npm' nao encontrado. Pulando instalacao de dependencias Node.js." -ForegroundColor Red
}

# 2. Instalação do amnesia-no-more
Write-Host "`n[2/3] Executando instalador do amnesia-no-more..." -ForegroundColor Yellow
if (Test-Path ".\amnesia-no-more\install.ps1") {
    Push-Location .\amnesia-no-more
    # Executando o script PowerShell do amnesia-no-more
    & .\install.ps1
    Pop-Location
} else {
    Write-Host "Script install.ps1 nao encontrado no amnesia-no-more." -ForegroundColor DarkGray
}

# 3. Setup do mindmuxai-brain (geralmente bash)
Write-Host "`n[3/3] Configurando mindmuxai-brain..." -ForegroundColor Yellow
if (Test-Path ".\mindmuxai-brain\setup") {
    if (Get-Command bash -ErrorAction SilentlyContinue) {
        Push-Location .\mindmuxai-brain
        bash setup
        Pop-Location
    } else {
        Write-Host "AVISO: 'bash' nao encontrado para executar o arquivo de setup do mindmuxai-brain." -ForegroundColor Red
        Write-Host "Se estiver no Windows, use o WSL ou Git Bash, ou verifique as instrucoes na pasta." -ForegroundColor Red
    }
} else {
    Write-Host "Script 'setup' nao encontrado no mindmuxai-brain." -ForegroundColor DarkGray
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  Instalacao do MegaMente concluida!       " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan

# ============================================================
# Amnesia-No-More: Instalador para Windows (PowerShell)
# Copia os arquivos necessários para o projeto atual
# ============================================================

param(
    [string]$ProjectDir = "."
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🧠 Amnesia-No-More: Instalando no diretório '$ProjectDir'..." -ForegroundColor Cyan
Write-Host ""

# Detecta o diretório do script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Cria estrutura de pastas
$pluginsDir = Join-Path $ProjectDir ".opencode\plugins"
$toolsDir = Join-Path $ProjectDir ".opencode\tools"

New-Item -ItemType Directory -Force -Path $pluginsDir | Out-Null
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

# Copia arquivos
Copy-Item (Join-Path $ScriptDir ".opencode\plugins\memory-layer.ts") -Destination $pluginsDir -Force
Copy-Item (Join-Path $ScriptDir ".opencode\tools\memory.ts") -Destination $toolsDir -Force
Copy-Item (Join-Path $ScriptDir "AGENTS.md") -Destination $ProjectDir -Force

# Merge ou cria opencode.json
$opencodeJson = Join-Path $ProjectDir "opencode.json"
if (Test-Path $opencodeJson) {
    Write-Host "⚠️  opencode.json já existe em '$ProjectDir'." -ForegroundColor Yellow
    Write-Host "   Adicione manualmente ao seu opencode.json:" -ForegroundColor Yellow
    Write-Host '   "instructions": ["AGENTS.md", ".opencode/memory/.memory-manifest.md", ".opencode/.session_context.md"]' -ForegroundColor White
    Write-Host ""
} else {
    Copy-Item (Join-Path $ScriptDir "opencode.json") -Destination $ProjectDir -Force
}

# Adiciona ao .gitignore
$gitignore = Join-Path $ProjectDir ".gitignore"
$memoryEntry = ".opencode/memory/"
$contextEntry = ".opencode/.session_context.md"

if (Test-Path $gitignore) {
    $content = Get-Content $gitignore -Raw
    if ($content -notmatch [regex]::Escape($memoryEntry)) {
        Add-Content $gitignore "`n# Amnesia-No-More (memorias locais)"
        Add-Content $gitignore $memoryEntry
        Add-Content $gitignore $contextEntry
    }
} else {
    Set-Content $gitignore "# Amnesia-No-More (memorias locais)`n$memoryEntry`n$contextEntry"
}

Write-Host "✅ Amnesia-No-More instalado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor White
Write-Host "  1. cd $ProjectDir" -ForegroundColor Gray
Write-Host "  2. opencode" -ForegroundColor Gray
Write-Host "  3. O agente agora tem memoria persistente!" -ForegroundColor Gray
Write-Host ""
Write-Host "Arquivos instalados:" -ForegroundColor White
Write-Host "  .opencode\plugins\memory-layer.ts" -ForegroundColor Gray
Write-Host "  .opencode\tools\memory.ts" -ForegroundColor Gray
Write-Host "  AGENTS.md" -ForegroundColor Gray
Write-Host "  opencode.json" -ForegroundColor Gray
Write-Host ""

@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

:: ============================================================
:: Amnesia-No-More: Instalador para Windows (CMD)
:: Uso: install.bat "C:\caminho\do\seu\projeto"
:: Se nenhum caminho for passado, pergunta ao usuario
:: ============================================================

echo.
echo ======================================================
echo   Amnesia-No-More: The Layered Synapse Protocol
echo   Instalador de Memoria Persistente para OpenCode CLI
echo ======================================================
echo.

:: Detecta o diretorio do script (onde estao os arquivos fonte)
set "SCRIPT_DIR=%~dp0"

:: Verifica se o usuario passou o caminho do projeto como argumento
if "%~1"=="" (
    echo Informe o caminho da raiz do seu projeto OpenCode:
    echo Exemplo: C:\Users\SeuUser\projetos\meu-app
    echo.
    set /p "PROJECT_DIR=Caminho do projeto: "
) else (
    set "PROJECT_DIR=%~1"
)

:: Remove aspas extras se houver
set "PROJECT_DIR=%PROJECT_DIR:"=%"

:: Verifica se o diretorio do projeto existe
if not exist "%PROJECT_DIR%" (
    echo.
    echo ERRO: O diretorio "%PROJECT_DIR%" nao existe.
    echo Verifique o caminho e tente novamente.
    pause
    exit /b 1
)

:: Verifica se nao esta tentando instalar na propria pasta
if "%SCRIPT_DIR:~0,-1%"=="%PROJECT_DIR%" (
    echo.
    echo ERRO: Voce esta tentando instalar na mesma pasta do Amnesia-No-More.
    echo O instalador deve apontar para a pasta do SEU PROJETO.
    echo.
    echo Exemplo: install.bat "C:\Users\SeuUser\projetos\meu-app"
    pause
    exit /b 1
)

echo.
echo Instalando em: %PROJECT_DIR%
echo.

:: Cria estrutura de pastas
if not exist "%PROJECT_DIR%\.opencode\plugins" mkdir "%PROJECT_DIR%\.opencode\plugins"
if not exist "%PROJECT_DIR%\.opencode\tools" mkdir "%PROJECT_DIR%\.opencode\tools"

:: Copia arquivos
copy /Y "%SCRIPT_DIR%.opencode\plugins\memory-layer.ts" "%PROJECT_DIR%\.opencode\plugins\" >nul
if errorlevel 1 (
    echo ERRO ao copiar memory-layer.ts
    pause
    exit /b 1
)

copy /Y "%SCRIPT_DIR%.opencode\tools\memory.ts" "%PROJECT_DIR%\.opencode\tools\" >nul
if errorlevel 1 (
    echo ERRO ao copiar memory.ts
    pause
    exit /b 1
)

copy /Y "%SCRIPT_DIR%AGENTS.md" "%PROJECT_DIR%\" >nul
if errorlevel 1 (
    echo ERRO ao copiar AGENTS.md
    pause
    exit /b 1
)

:: Verifica se ja existe opencode.json no projeto
if exist "%PROJECT_DIR%\opencode.json" (
    echo [!] opencode.json ja existe no projeto.
    echo     Adicione manualmente ao seu opencode.json:
    echo.
    echo     "instructions": ["AGENTS.md", ".opencode/memory/.memory-manifest.md", ".opencode/.session_context.md"]
    echo.
) else (
    copy /Y "%SCRIPT_DIR%opencode.json" "%PROJECT_DIR%\" >nul
)

:: Adiciona ao .gitignore
if exist "%PROJECT_DIR%\.gitignore" (
    findstr /C:".opencode/memory/" "%PROJECT_DIR%\.gitignore" >nul 2>&1
    if errorlevel 1 (
        echo.>> "%PROJECT_DIR%\.gitignore"
        echo # Amnesia-No-More (memorias locais)>> "%PROJECT_DIR%\.gitignore"
        echo .opencode/memory/>> "%PROJECT_DIR%\.gitignore"
        echo .opencode/.session_context.md>> "%PROJECT_DIR%\.gitignore"
    )
) else (
    echo # Amnesia-No-More (memorias locais)> "%PROJECT_DIR%\.gitignore"
    echo .opencode/memory/>> "%PROJECT_DIR%\.gitignore"
    echo .opencode/.session_context.md>> "%PROJECT_DIR%\.gitignore"
)

echo.
echo ======================================================
echo   INSTALACAO CONCLUIDA COM SUCESSO!
echo ======================================================
echo.
echo Arquivos instalados em: %PROJECT_DIR%
echo.
echo   .opencode\plugins\memory-layer.ts
echo   .opencode\tools\memory.ts
echo   AGENTS.md
echo   opencode.json
echo.
echo Proximos passos:
echo   1. Abra o terminal na pasta do projeto
echo   2. Execute: opencode
echo   3. Pronto! O agente agora tem memoria persistente.
echo.
pause

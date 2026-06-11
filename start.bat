@echo off
setlocal EnableDelayedExpansion
title ARCADE FIGHT
color 0A

set ROOT=%~dp0
cd /d "%ROOT%"

echo.
echo ================================================
echo               ARCADE FIGHT
echo ================================================
echo.

:: ================================================
::  Verificacoes
:: ================================================

if not exist "%ROOT%backend\venv\Scripts\activate.bat" (
    echo [ERRO] Ambiente virtual do backend nao encontrado.
    echo Execute "install.bat" primeiro.
    echo.
    pause
    exit /b 1
)

if not exist "%ROOT%game\node_modules" (
    echo [ERRO] Dependencias do jogo nao instaladas.
    echo Execute "install.bat" primeiro.
    echo.
    pause
    exit /b 1
)

:: ================================================
::  PING antecipado ao Render (acorda o servidor)
::  Roda em background, nao bloqueia o bat
:: ================================================

echo  Enviando sinal de ativacao ao servidor remoto...
start /b powershell -NoProfile -WindowStyle Hidden -Command ^
  "try { Invoke-WebRequest -Uri 'https://arcade-fight-ifsp.onrender.com' -TimeoutSec 60 -UseBasicParsing | Out-Null } catch {}"

:: ================================================
::  BACKEND
:: ================================================

echo [1/2] Iniciando backend (FastAPI)...
cd /d "%ROOT%backend"

start "Arcade Fight - Backend" /min cmd /c "call venv\Scripts\activate.bat && python main.py"

echo  -^> Aguardando backend ficar disponivel...
timeout /t 5 /nobreak >nul

:: ================================================
::  JOGO
:: ================================================

echo [2/2] Iniciando jogo (Electron)...
echo.

echo  Verificando servidor online...
set "TENTATIVA=1"
:verificar_servidor
echo  Verificando conexao com o servidor... (tentativa !TENTATIVA!/5)
powershell -NoProfile -Command "try{$r=(Invoke-WebRequest -Uri 'https://arcade-fight-ifsp.onrender.com' -TimeoutSec 5 -UseBasicParsing).Content; if($r -match 'API rodando'){exit 0}else{exit 1}}catch{exit 1}"
set "RESULTADO=!errorlevel!"
if !RESULTADO! EQU 0 (
    echo  Servidor online! Iniciando o jogo...
    echo.
    goto :iniciar_electron
)
if !TENTATIVA! EQU 5 (
    echo  Conexao falhou apos 5 tentativas. Iniciando modo offline...
    echo.
    goto :iniciar_electron
)
echo  Servidor nao respondeu. Aguardando 6s antes da proxima tentativa...
set /a TENTATIVA=!TENTATIVA!+1
timeout /t 6 /nobreak >nul
goto :verificar_servidor

:iniciar_electron

echo Para encerrar, feche a janela do jogo. O backend
echo continuara rodando ate voce fechar a janela "Backend".
echo.

cd /d "%ROOT%game"
call npx electron .

:: Quando o jogo fechar, encerra tambem o backend
echo.
echo Encerrando backend...
taskkill /FI "WINDOWTITLE eq Arcade Fight - Backend*" /T /F >nul 2>&1

echo.
echo Tchau!
timeout /t 2 /nobreak >nul

endlocal
exit /b 0

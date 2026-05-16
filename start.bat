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

@echo off
title ARCADE FIGHT - INSTALADOR FINAL
color 0A

:: [NOVO] VERIFICAR SE EH ADMINISTRADOR
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ======================================================
    echo [ERRO] VOCE PRECISA EXECUTAR COMO ADMINISTRADOR
    echo Clique com o botao direito no arquivo e escolha:
    echo "Executar como Administrador"
    echo ======================================================
    pause
    exit /b
)

setlocal EnableDelayedExpansion
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo [1/5] Verificando Python...
set "PYTHON_EXE=C:\Program Files\Python312\python.exe"

if not exist "%PYTHON_EXE%" (
    echo [ERRO] Python 3.12 nao encontrado em %PYTHON_EXE%
    echo Por favor, instale o Python 3.12 antes.
    pause
    exit /b
)

:: ================================================
:: BACKEND (Onde costuma dar o erro)
:: ================================================
echo.
echo [2/5] Configurando Backend...
cd /d "%ROOT%backend"

if exist "venv" (
    echo Removendo venv antiga para evitar conflitos...
    :: Usando /Q para não pedir confirmação e evitar travar
    rmdir /S /Q "venv"
)

echo Criando ambiente virtual...
:: Se travar aqui, o problema e o antivirus ou permissao de pasta
"%PYTHON_EXE%" -m venv venv
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao criar VENV. Tente desativar o Antivirus temporariamente.
    pause
    exit /b
)

set "VENV_PY=%ROOT%backend\venv\Scripts\python.exe"

echo Instalando dependencias do Python (Pip)...
"%VENV_PY%" -m pip install --upgrade pip setuptools wheel
"%VENV_PY%" -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar requirements.txt
    pause
)

:: ================================================
:: FRONTEND (Node.js)
:: ================================================
echo.
echo [3/5] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao instalado ou nao encontrado no PATH.
    pause
    exit /b
)

echo.
echo [4/5] Instalando dependencias do Jogo (Electron)...
cd /d "%ROOT%game"
:: 'call' e mais seguro que 'start' para evitar que o CMD feche
call npm install --no-fund --no-audit

:: ================================================
:: FINALIZACAO
:: ================================================
echo.
echo [5/5] Criando atalhos...
cd /d "%ROOT%"
if exist "start.bat" (
    copy /Y "start.bat" "%USERPROFILE%\Desktop\Arcade Fight.bat" >nul 2>&1
)

echo.
echo ================================================
echo        INSTALACAO CONCLUIDA COM SUCESSO!
echo ================================================
pause
@echo off
title ARCADE FIGHT - INSTALADOR
color 0A
setlocal EnableDelayedExpansion

:: ======================================================================
:: Verificar permissao de Administrador
:: ======================================================================
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo  [ERRO] Execute este arquivo como Administrador.
    echo  Clique com o botao direito e escolha "Executar como Administrador".
    echo.
    pause
    exit /b 1
)

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo  ================================================
echo           ARCADE FIGHT  ^|  INSTALADOR
echo  ================================================
echo.

:: ======================================================================
:: [1/6] Python 3.12.10
:: ======================================================================
echo  [1/6] Verificando Python 3.12...

set "PYTHON_EXE="

if exist "C:\Program Files\Python312\python.exe" (
    set "PYTHON_EXE=C:\Program Files\Python312\python.exe"
    goto :python_ok
)

if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    goto :python_ok
)

:: Busca pelo Python via PowerShell de forma segura
powershell -NoProfile -Command "$p=(Get-Command python -EA SilentlyContinue).Source; if($p -match 'Python312'){$p} else {''}" >"%TEMP%\pypath.txt" 2>nul
set /p PYTHON_FOUND=<"%TEMP%\pypath.txt"
del /f /q "%TEMP%\pypath.txt" >nul 2>&1

if defined PYTHON_FOUND (
    if not "!PYTHON_FOUND!"=="" (
        set "PYTHON_EXE=!PYTHON_FOUND!"
        goto :python_ok
    )
)

:: Python nao encontrado - baixar e instalar
echo  Python 3.12 nao encontrado. Baixando instalador (~27 MB)...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;(New-Object Net.WebClient).DownloadFile('https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe','%TEMP%\python312.exe')"

if not exist "%TEMP%\python312.exe" (
    echo.
    echo  [ERRO] Falha ao baixar o Python. Verifique sua conexao com a internet.
    echo.
    pause
    exit /b 1
)

echo  Instalando Python 3.12.10...
"%TEMP%\python312.exe" /quiet InstallAllUsers=1 PrependPath=1 Include_pip=1
del /f /q "%TEMP%\python312.exe" >nul 2>&1
set "PYTHON_EXE=C:\Program Files\Python312\python.exe"
echo  Python 3.12.10 instalado com sucesso!

:python_ok
echo  Python encontrado: !PYTHON_EXE!

:: ======================================================================
:: [2/6] Node.js 22.15.0 LTS
:: ======================================================================
echo.
echo  [2/6] Verificando Node.js...

set "NODE_OK=0"
if exist "C:\Program Files\nodejs\node.exe" set "NODE_OK=1"

if "!NODE_OK!"=="0" (
    where node >nul 2>&1
    if not errorlevel 1 set "NODE_OK=1"
)

if "!NODE_OK!"=="0" (
    echo  Node.js nao encontrado. Baixando instalador (~30 MB)...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;(New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v22.15.0/node-v22.15.0-x64.msi','%TEMP%\nodejs.msi')"

    if not exist "%TEMP%\nodejs.msi" (
        echo.
        echo  [ERRO] Falha ao baixar o Node.js. Verifique sua conexao com a internet.
        echo.
        pause
        exit /b 1
    )

    echo  Instalando Node.js 22.15.0 LTS...
    msiexec /i "%TEMP%\nodejs.msi" /quiet /norestart
    del /f /q "%TEMP%\nodejs.msi" >nul 2>&1
    echo  Node.js instalado com sucesso!
)

if exist "C:\Program Files\nodejs" (
    set "PATH=C:\Program Files\nodejs;!PATH!"
)

echo  Node.js: OK

:: ======================================================================
:: [3/6] Ambiente virtual Python (venv)
:: ======================================================================
echo.
echo  [3/6] Configurando ambiente virtual Python...

cd /d "%ROOT%backend"

if exist "venv" (
    echo  Removendo venv existente...
    rmdir /S /Q "venv"
    if exist "venv" (
        echo.
        echo  [ERRO] Nao foi possivel remover backend\venv.
        echo  Feche todos os programas que usem essa pasta e tente novamente.
        echo.
        pause
        exit /b 1
    )
    echo  venv antiga removida.
)

echo  Criando novo ambiente virtual...
"!PYTHON_EXE!" -m venv venv
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha ao criar o ambiente virtual.
    echo.
    pause
    exit /b 1
)
echo  Ambiente virtual criado!

:: ======================================================================
:: [4/6] Dependencias do backend (Python)
:: ======================================================================
echo.
echo  [4/6] Instalando dependencias do backend...

set "VENV_PY=%ROOT%backend\venv\Scripts\python.exe"

echo  Atualizando pip...
"!VENV_PY!" -m pip install --upgrade pip setuptools wheel --quiet

echo  Instalando requirements.txt...
"!VENV_PY!" -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha ao instalar dependencias do backend.
    echo.
    pause
    exit /b 1
)
echo  Dependencias do backend instaladas!

:: ======================================================================
:: [5/6] Dependencias do jogo (npm)
:: ======================================================================
echo.
echo  [5/6] Instalando dependencias do jogo (Electron)...

cd /d "%ROOT%game"
call npm install --no-fund --no-audit
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha ao instalar dependencias do jogo.
    echo.
    pause
    exit /b 1
)
echo  Dependencias do jogo instaladas!

:: ======================================================================
:: [6/6] Atalho na Area de Trabalho
:: ======================================================================
echo.
echo  [6/6] Verificando atalho na Area de Trabalho...

set "LNK=%USERPROFILE%\Desktop\Arcade Fight.lnk"

if not exist "%LNK%" (
    echo  Criando atalho na Area de Trabalho...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell;$s=$ws.CreateShortcut('%USERPROFILE%\Desktop\Arcade Fight.lnk');$s.TargetPath='%ROOT%start.bat';$s.WorkingDirectory='%ROOT%';$s.Description='Iniciar Arcade Fight';$s.Save()"
    if exist "%LNK%" (
        echo  Atalho criado com sucesso!
    ) else (
        echo  [AVISO] Nao foi possivel criar o atalho. Use o start.bat diretamente.
    )
) else (
    echo  Atalho ja existe. OK
)

:: ======================================================================
:: Conclusao
:: ======================================================================
echo.
echo  ================================================
echo        INSTALACAO CONCLUIDA COM SUCESSO!
echo  ================================================
echo.
echo  Para iniciar o jogo use:
echo    - Atalho "Arcade Fight" na Area de Trabalho
echo    - Ou execute: start.bat
echo.
set /p "INICIAR=  Deseja iniciar o jogo agora? (S/N): "
if /i "!INICIAR!"=="S" (
    cd /d "%ROOT%"
    call start.bat
)

endlocal
exit /b 0
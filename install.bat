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

:: Log de debug para confirmar que o script chegou ate aqui
echo %ROOT% > "%TEMP%\arcade_debug.txt"

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
)
if not defined PYTHON_EXE (
    if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    )
)
if not defined PYTHON_EXE (
    for /f "usebackq delims=" %%i in (`py -3.12 -c "import sys; print(sys.executable)" 2^>nul`) do (
        set "PYTHON_EXE=%%i"
    )
)

if not defined PYTHON_EXE (
    echo  Python 3.12 nao encontrado. Baixando instalador (~27 MB)...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;(New-Object Net.WebClient).DownloadFile('https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe','%TEMP%\python-3.12.10-amd64.exe')"
    if not exist "%TEMP%\python-3.12.10-amd64.exe" (
        echo.
        echo  [ERRO] Falha ao baixar o Python. Verifique sua conexao com a internet.
        pause
        exit /b 1
    )
    echo  Instalando Python 3.12.10... (pode demorar alguns minutos)
    "%TEMP%\python-3.12.10-amd64.exe" /quiet InstallAllUsers=1 PrependPath=1 Include_pip=1
    if errorlevel 1 (
        echo.
        echo  [ERRO] Falha ao instalar o Python.
        del /f /q "%TEMP%\python-3.12.10-amd64.exe" >nul 2>&1
        pause
        exit /b 1
    )
    del /f /q "%TEMP%\python-3.12.10-amd64.exe" >nul 2>&1
    set "PYTHON_EXE=C:\Program Files\Python312\python.exe"

    :: Recarrega o PATH do sistema apos instalar o Python
    for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable('Path','Machine')"`) do set "SYS_PATH=%%i"
    set "PATH=!SYS_PATH!;%PATH%"

    echo  Python 3.12.10 instalado com sucesso!
) else (
    echo  Python 3.12 ja instalado. OK
)

:: ======================================================================
:: [2/6] Node.js 22.15.0 LTS
:: ======================================================================
echo.
echo  [2/6] Verificando Node.js...

set "NODE_OK=0"
where node >nul 2>&1
if not errorlevel 1 set "NODE_OK=1"
if exist "C:\Program Files\nodejs\node.exe" set "NODE_OK=1"

if "%NODE_OK%"=="0" (
    echo  Node.js nao encontrado. Baixando instalador (~30 MB)...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;(New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v22.15.0/node-v22.15.0-x64.msi','%TEMP%\node-v22.15.0-x64.msi')"
    if not exist "%TEMP%\node-v22.15.0-x64.msi" (
        echo.
        echo  [ERRO] Falha ao baixar o Node.js. Verifique sua conexao com a internet.
        pause
        exit /b 1
    )
    echo  Instalando Node.js 22.15.0 LTS... (pode demorar alguns minutos)
    msiexec /i "%TEMP%\node-v22.15.0-x64.msi" /quiet /norestart
    set "MSI_ERR=!errorlevel!"
    del /f /q "%TEMP%\node-v22.15.0-x64.msi" >nul 2>&1
    if !MSI_ERR! neq 0 if !MSI_ERR! neq 3010 (
        echo.
        echo  [ERRO] Falha ao instalar o Node.js. Codigo de erro: !MSI_ERR!
        pause
        exit /b 1
    )

    :: Recarrega o PATH do sistema apos instalar o Node.js
    for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable('Path','Machine')"`) do set "SYS_PATH=%%i"
    set "PATH=!SYS_PATH!;%PATH%"

    echo  Node.js 22.15.0 LTS instalado com sucesso!
) else (
    echo  Node.js ja instalado. OK
)

:: Garante que o caminho padrao do Node esteja no PATH desta sessao CMD
if exist "C:\Program Files\nodejs" (
    set "PATH=C:\Program Files\nodejs;!PATH!"
)

:: ======================================================================
:: [3/6] Ambiente virtual Python (venv)
:: ======================================================================
echo.
echo  [3/6] Configurando ambiente virtual Python...

cd /d "%ROOT%backend"

if exist "venv" (
    echo  Removendo venv existente (pode ter caminhos invalidos de outro dispositivo)...
    rmdir /S /Q "venv"
    if exist "venv" (
        echo.
        echo  [ERRO] Nao foi possivel remover backend\venv.
        echo  Feche todos os programas que usem arquivos dessa pasta e tente novamente.
        pause
        exit /b 1
    )
    echo  venv antiga removida.
)

echo  Criando novo ambiente virtual com Python 3.12...
"%PYTHON_EXE%" -m venv venv
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha ao criar o ambiente virtual.
    echo  Causa provavel: antivirus bloqueando ou falta de permissao na pasta.
    pause
    exit /b 1
)
echo  Ambiente virtual criado!

:: ======================================================================
:: [4/6] Dependencias do backend (Python)
:: ======================================================================
echo.
echo  [4/6] Instalando dependencias do backend (Python)...

set "VENV_PY=%ROOT%backend\venv\Scripts\python.exe"

echo  Atualizando pip, setuptools e wheel...
"%VENV_PY%" -m pip install --upgrade pip setuptools wheel --quiet

echo  Instalando pacotes do requirements.txt...
"%VENV_PY%" -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha ao instalar dependencias do backend.
    echo  Verifique o arquivo backend\requirements.txt e tente novamente.
    pause
    exit /b 1
)
echo  Dependencias do backend instaladas!

:: ======================================================================
:: [5/6] Dependencias do jogo (npm / Electron)
:: ======================================================================
echo.
echo  [5/6] Instalando dependencias do jogo (Electron/Node.js)...

cd /d "%ROOT%game"
call npm install --no-fund --no-audit
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha ao instalar dependencias do jogo (npm install).
    echo  Verifique sua conexao com a internet e tente novamente.
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
set "START_BAT=%ROOT%start.bat"
set "PS_SCRIPT=%TEMP%\arcade_atalho.ps1"

if not exist "%LNK%" (
    echo  Criando atalho "Arcade Fight" na Area de Trabalho...
    echo $ws = New-Object -ComObject WScript.Shell > "%PS_SCRIPT%"
    echo $lnk = $env:USERPROFILE + '\Desktop\Arcade Fight.lnk' >> "%PS_SCRIPT%"
    echo $s = $ws.CreateShortcut($lnk) >> "%PS_SCRIPT%"
    echo $s.TargetPath = '%START_BAT%' >> "%PS_SCRIPT%"
    echo $s.WorkingDirectory = '%ROOT%' >> "%PS_SCRIPT%"
    echo $s.Description = 'Iniciar Arcade Fight' >> "%PS_SCRIPT%"
    echo $s.WindowStyle = 1 >> "%PS_SCRIPT%"
    echo $s.Save() >> "%PS_SCRIPT%"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"
    del /f /q "%PS_SCRIPT%" >nul 2>&1
    if exist "%LNK%" (
        echo  Atalho criado com sucesso!
    ) else (
        echo  [AVISO] Nao foi possivel criar o atalho automaticamente.
        echo  Para iniciar o jogo, use o arquivo start.bat diretamente.
    )
) else (
    echo  Atalho ja existe na Area de Trabalho. OK
)

:: ======================================================================
:: Conclusao
:: ======================================================================
echo.
echo  ================================================
echo         INSTALACAO CONCLUIDA COM SUCESSO!
echo  ================================================
echo.
echo  Como iniciar o jogo:
echo    - Atalho "Arcade Fight" na Area de Trabalho
echo    - Ou execute: start.bat
echo.

set "INICIAR=N"
set /p INICIAR=  Deseja iniciar o jogo agora? (S/N):
if /i "%INICIAR%"=="S" (
    cd /d "%ROOT%"
    call start.bat
)

endlocal
exit /b 0

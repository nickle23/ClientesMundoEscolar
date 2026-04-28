@echo off
setlocal enabledelayedexpansion
title Compilador EXE Profesional - Mundo Escolar
color 0A
mode con: cols=70 lines=35

:: ===========================================
:: CONFIGURACION
:: ===========================================
set "NOMBRE_EXE=Gestor_Clientes_MundoEscolar"
set "NOMBRE_FINAL=Gestion de Clientes - Mundo Escolar.exe"
set "SCRIPT_ORIGEN=gestor_sistema.py"

:: ===========================================
:: FUNCIONES
:: ===========================================
:menu_principal
cls
color 0A
echo.
echo  +========================================+
echo  ^|          COMPILADOR EXE              ^|
echo  ^|        MUNDO ESCOLAR v5.0           ^|
echo  +========================================+
echo.
echo   [1]  Compilar EXE (Limpio)
echo   [2]  Solo Limpiar Espacio
echo   [3]  Ver Espacio en Disco
echo   [4]  Ver Archivos Actuales
echo   [5]  Salir
echo.
echo  -----------------------------------------
echo.
set /p opcion="  Selecciona una opcion: "

if "%opcion%"=="1" goto compilar
if "%opcion%"=="2" goto solo_limpiar
if "%opcion%"=="3" goto ver_espacio
if "%opcion%"=="4" goto ver_archivos
if "%opcion%"=="5" goto salir
goto menu_principal

:: ===========================================
:: COMPILAR EXE
:: ===========================================
:compilar
cls
color 0B
echo.
echo  +========================================+
echo  ^|          COMPILANDO SISTEMA          ^|
echo  +========================================+
echo.

:: Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERROR] Python no encontrado en el sistema
    echo  [INFO] Instala Python desde python.org
    pause
    goto menu_principal
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo  [OK] %%v detectado
echo.

:: ===========================================
:: LIMPIEZA PREVIA INTELIGENTE
:: ===========================================
color 0E
echo  [LIMPIEZA] Limpiando archivos residuales...
echo.

:: Carpeta build
if exist "build" (
    echo  [X] Eliminando build\
    rmdir /s /q build 2>nul
)

:: Carpeta dist
if exist "dist" (
    echo  [X] Eliminando dist\
    rmdir /s /q dist 2>nul
)

:: EXE anterior en raiz
for %%f in (*.exe) do (
    echo  [X] Eliminando: %%f
    del /q "%%f" 2>nul
)

:: EXE en subcarpetas (inteligente)
for /d %%d in (*) do (
    set "folder=%%~nd"
    if /i "!folder!" neq "data" (
        if /i "!folder!" neq "static" (
            if /i "!folder!" neq "backups" (
                if /i "!folder!" neq "PYTHON" (
                    for %%f in ("%%d\*.exe") do (
                        echo  [X] Eliminando: %%f
                        del /q "%%f" 2>nul
                    )
                )
            )
        )
    )
)

:: Archivos .spec
for %%f in (*.spec) do (
    echo  [X] Eliminando: %%f
    del /q "%%f" 2>nul
)

:: __pycache__
if exist "__pycache__" (
    echo  [X] Eliminando __pycache__\
    rmdir /s /q __pycache__ 2>nul
)

:: Archivos .pyc
for /r %%f in (*.pyc) do (
    del /q "%%f" 2>nul
)

:: Archivos de log
for %%f in (debug_*.log warn-*.txt *-log.txt) do (
    if exist "%%f" (
        echo  [X] Eliminando: %%f
        del /q "%%f" 2>nul
    )
)

:: Archivos temporales
for %%f in (*~ *.tmp *.bak) do (
    if exist "%%f" (
        echo  [X] Eliminando: %%f
        del /q "%%f" 2>nul
    )
)

echo.
color 0A
echo  [OK] Espacio limpiado correctamente
echo.

:: ===========================================
:: VERIFICAR DEPENDENCIAS
:: ===========================================
color 0B
echo  [VERIFICANDO] Dependencias necesarias...
echo.

python -c "import tkintermapview" 2>nul
if errorlevel 1 (
    echo  [*] Instalando tkintermapview...
    python -m pip install tkintermapview --quiet 2>nul
)

python -c "import PyInstaller" 2>nul
if errorlevel 1 (
    echo  [*] Instalando PyInstaller...
    python -m pip install pyinstaller --quiet 2>nul
)

echo  [OK] Dependencias listas
echo.

:: ===========================================
:: COMPILACION
:: ===========================================
color 0E
echo  [COMPILANDO] Generando ejecutable...
echo  [INFO] Este proceso tomara 2-5 minutos...
echo.

python -m PyInstaller ^
    --noconfirm ^
    --onefile ^
    --windowed ^
    --name "%NOMBRE_EXE%" ^
    --add-data "data;data" ^
    --add-data "static;static" ^
    --add-data "index.html;." ^
    --add-data "trabajadores.html;." ^
    --hidden-import tkinter ^
    --hidden-import tkinter.ttk ^
    --hidden-import tkinter.messagebox ^
    --hidden-import tkinter.scrolledtext ^
    --hidden-import tkinter.filedialog ^
    --hidden-import tkintermapview ^
    --hidden-import sqlite3 ^
    --hidden-import hashlib ^
    --hidden-import threading ^
    --hidden-import logging ^
    --hidden-import datetime ^
    --hidden-import json ^
    --hidden-import os ^
    --hidden-import sys ^
    --hidden-import shutil ^
    --hidden-import base64 ^
    --hidden-import mimetypes ^
    --hidden-import webbrowser ^
    --hidden-import http.server ^
    --hidden-import urllib ^
    --clean ^
    "%SCRIPT_ORIGEN%"

if errorlevel 1 (
    color 0C
    echo.
    echo  [ERROR] La compilacion fallo
    echo  [INFO] Revisa los errores arriba
    pause
    goto menu_principal
)

:: ===========================================
:: LIMPIEZA POST-COMPILACION
:: ===========================================
echo.
color 0E
echo  [LIMPIEZA] Limpiando archivos residuales...
echo.

if exist "build" (
    echo  [X] Eliminando build\
    rmdir /s /q build 2>nul
)

for %%f in (*.spec) do (
    echo  [X] Eliminando: %%f
    del /q "%%f" 2>nul
)

for %%f in (warn-*.txt *-log.txt) do (
    if exist "%%f" (
        echo  [X] Eliminando: %%f
        del /q "%%f" 2>nul
    )
)

if exist "__pycache__" (
    echo  [X] Eliminando __pycache__\
    rmdir /s /q __pycache__ 2>nul
)

:: ===========================================
:: MOVER EXE A RAIZ
:: ===========================================
echo.
color 0B
echo  [MOVIENDO] Organizando ejecutable...

if exist "dist\%NOMBRE_EXE%.exe" (
    move /y "dist\%NOMBRE_EXE%.exe" "%NOMBRE_FINAL%" >nul 2>nul
    echo  [OK] EXE movido a raiz: %NOMBRE_FINAL%
) else (
    echo  [ERROR] No se encontro el EXE compilado
)

:: Eliminar carpeta dist vacia
if exist "dist" (
    rmdir /s /q dist 2>nul
)

echo.

:: ===========================================
:: RESULTADO FINAL
:: ===========================================
:resultado
cls
color 0A
echo.
echo  +========================================+
echo  ^|          COMPILACION EXITOSA         ^|
echo  +========================================+
echo.
echo  [OK] Tu ejecutable esta listo
echo.
echo    Nombre: %NOMBRE_FINAL%
for %%f in ("%NOMBRE_FINAL%") do echo    Peso: %%~zf bytes
echo.
echo  [INFO] Contenido de la carpeta:
echo.
dir /b /o-n 2>nul | findstr /v /i ".py .bat .json .md .git"
echo.
echo  ----------------------------------------
echo.
echo   [1] Volver al Menu
echo   [2] Salir
echo.
set /p opcion="  Selecciona: "
if "%opcion%"=="1" goto menu_principal
goto salir

:: ===========================================
:: SOLO LIMPIAR
:: ===========================================
:solo_limpiar
cls
color 0E
echo.
echo  +========================================+
echo  ^|          LIMPIEZA DE ESPACIO        ^|
echo  +========================================+
echo.

echo  [LIMPIEZA] Eliminando archivos basura...
echo.

if exist "build" (rmdir /s /q build 2>nul)
if exist "dist" (rmdir /s /q dist 2>nul)
for %%f in (*.exe) do (del /q "%%f" 2>nul)
for %%f in (*.spec) do (del /q "%%f" 2>nul)
for %%f in (*.pyc) do (del /q "%%f" 2>nul)
for %%f in (*.pyo) do (del /q "%%f" 2>nul)
for %%f in (*.log) do (del /q "%%f" 2>nul)
for %%f in (*~ *.tmp *.bak) do (del /q "%%f" 2>nul)
if exist "__pycache__" (rmdir /s /q __pycache__ 2>nul)

echo.
echo  [OK] Limpieza completada
echo.
pause
goto menu_principal

:: ===========================================
:: VER ESPACIO
:: ===========================================
:ver_espacio
cls
color 0B
echo.
echo  +========================================+
echo  ^|          ESPACIO EN DISCO           ^|
echo  +========================================+
echo.

echo  [DISCO] Espacio usado por carpetas:
echo.

for /d %%d in (data static backups) do (
    set "size=0"
    for /r "%%d" %%f in (*) do set /a size+=%%~zf
    echo    %%d: !size! bytes
)

echo.
echo  [EXE] Ejecutables actuales:
echo.
for %%f in (*.exe) do (
    for %%a in ("%%f") do echo    [*] %%f (%%~za bytes)
)

echo.
pause
goto menu_principal

:: ===========================================
:: VER ARCHIVOS
:: ===========================================
:ver_archivos
cls
color 0B
echo.
echo  +========================================+
echo  ^|         ARCHIVOS DEL PROYECTO        ^|
echo  +========================================+
echo.

echo  [ARCHIVOS] Archivos en carpeta raiz:
echo.
dir /b *.py *.bat *.html *.json *.md 2>nul

echo.
echo  [CARPETAS] Carpetas:
echo.
dir /b /ad 2>nul

echo.
pause
goto menu_principal

:: ===========================================
:: SALIR
:: ===========================================
:salir
cls
color 0A
echo.
echo  Gracias por usar el Compilador Profesional
echo.
echo  Mundo Escolar - Sistema de Gestion de Clientes
echo.
timeout /t 2 >nul
exit /b 0

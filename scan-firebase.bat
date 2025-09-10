@echo off
chcp 65001 >nul
echo =======================================
echo 🔍 Escaneo de Firebase duplicados
echo =======================================

REM Archivo de salida
set OUTPUT=duplicados.txt
echo Reporte de imports y initializeApp > %OUTPUT%
echo ==================================== >> %OUTPUT%

REM Buscar initializeApp en src (excluyendo node_modules y .git)
for /R src %%f in (*.js *.jsx) do (
  echo %%f | findstr /I /V "node_modules .git" >nul
  if %errorlevel%==0 (
    findstr /I "initializeApp(" "%%f" >> %OUTPUT%
  )
)

REM Buscar imports directos de firebase/app
for /R src %%f in (*.js *.jsx) do (
  echo %%f | findstr /I /V "node_modules .git" >nul
  if %errorlevel%==0 (
    findstr /I "from \"firebase/app\"" "%%f" >> %OUTPUT%
  )
)

echo =======================================
echo ✅ Escaneo finalizado. Revisa %OUTPUT%
echo =======================================
pause

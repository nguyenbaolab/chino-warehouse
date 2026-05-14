@echo off
setlocal

set HOST=db.otezblwpbjbahsvfjocf.supabase.co
set PORT=5432
set USER=postgres
set DBNAME=postgres
set OUTDIR=supabase/db_dump_schema/

:: Tạo tên file theo ngày giờ hiện tại
for /f "tokens=1-3 delims=/" %%a in ("%date%") do (
    set DAY=%%a
    set MONTH=%%b
    set YEAR=%%c
)
set FILENAME=schema_dump_%DAY%%MONTH%%YEAR%.sql

echo ============================================
echo   Chino Warehouse - Supabase Schema Dump
echo ============================================
echo Host   : %HOST%
echo Output : %OUTDIR%%FILENAME%
echo.
echo Nhap password Supabase:

pg_dump ^
  --schema-only ^
  --no-owner ^
  --no-acl ^
  -h %HOST% ^
  -p %PORT% ^
  -U %USER% ^
  -d %DBNAME% ^
  -f "%OUTDIR%%FILENAME%"

if %ERRORLEVEL% == 0 (
    echo.
    echo [OK] Dump thanh cong: %FILENAME%
) else (
    echo.
    echo [LOI] Dump that bai. Kiem tra lai password hoac ket noi mang.
)

pause

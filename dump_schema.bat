@echo off
setlocal

:: ============================================================
:: Chino's Store — snapshot schema Supabase (pg_dump)
:: KHONG thay the quy tac maintain supabase/migrations/schema.sql thu cong.
::
:: Session Pooler — lay HOST va USER tu Supabase Dashboard:
::   Project -> Connect -> Connection string -> "Session pooler"
::   (Direct db.<ref>.supabase.co:5432 thuong chi IPv6 -> de timeout tren mang IPv4)
::
:: HOST : aws-0-<region>.pooler.supabase.com  (dien dung <region> tu Dashboard, VD ap-southeast-1)
:: PORT : 5432  (Session pooler — KHONG dung 6543 transaction pooler; pg_dump khong hop)
:: USER : postgres.<project_ref>  (VD postgres.otezblwpbjbahsvfjocf — co hau toi project ref)
:: ============================================================
set HOST=aws-1-eu-central-1.pooler.supabase.com
set PORT=5432
set USER=postgres.otezblwpbjbahsvfjocf
set DBNAME=postgres
set OUTDIR=supabase\db_dump_schema

:: pg_dump phai >= phien ban Postgres cua Supabase (PG15/17); neu thap hon pg_dump tu abort.
echo.
echo pg_dump version:
pg_dump --version
if %ERRORLEVEL% neq 0 (
    echo.
    echo [LOI] Khong tim thay pg_dump. Cai PostgreSQL client tools ^(cung major version voi Supabase^).
    pause
    exit /b 1
)

if not exist "%OUTDIR%" mkdir "%OUTDIR%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set STAMP=%%i
set FILENAME=schema_dump_%STAMP%.sql

echo.
echo ============================================
echo   Chino's Store - Supabase Schema Dump
echo ============================================
echo Host   : %HOST%
echo User   : %USER%
echo Output : %OUTDIR%\%FILENAME%
echo.
echo Ghi chu: pg_dump se tu hoi password database khi can (lay tu Dashboard - Connect).

:: Chi dump schema public; neu sau nay co schema rieng, bo sung --schema=<ten>
pg_dump ^
  --schema-only ^
  --schema=public ^
  --no-owner ^
  --no-acl ^
  -h %HOST% ^
  -p %PORT% ^
  -U %USER% ^
  -d %DBNAME% ^
  -f "%OUTDIR%\%FILENAME%"

if %ERRORLEVEL% == 0 (
    echo.
    echo [OK] Dump thanh cong: %FILENAME%
) else (
    echo.
    echo [LOI] Dump that bai. Kiem tra HOST/USER ^(Session pooler^), password, pg_dump version, hoac ket noi mang.
)

pause

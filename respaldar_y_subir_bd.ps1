# Script de Respaldo y Subida de Base de Datos PostgreSQL a VPS
$DB_HOST = "127.0.0.1"
$DB_PORT = "5432"
$DB_NAME = "itsmtsice"
$DB_USER = "useradmin"
$DB_PASS = "deae880618"
$BACKUP_FILE = "sice_backup.sql"
$VPS_HOST = "deployer@sice.maewalliscorp.org"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SICE — Respaldando base de datos local..." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$env:PGPASSWORD = $DB_PASS

# Intentar pg_dump
if (Get-Command "pg_dump" -ErrorAction SilentlyContinue) {
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --clean --if-exists -f $BACKUP_FILE
} else {
    # Si pg_dump no está en el PATH de Windows, buscar la ruta común de PostgreSQL
    $pgPath = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "pg_dump.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pgPath) {
        & $pgPath.FullName -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --clean --if-exists -f $BACKUP_FILE
    } else {
        Write-Host "❌ No se encontró pg_dump en el sistema. Asegúrate de tener PostgreSQL instalado en tu computadora." -ForegroundColor Red
        exit 1
    }
}

if (Test-Path $BACKUP_FILE) {
    Write-Host "✅ Respaldo creado correctamente: $BACKUP_FILE" -ForegroundColor Green
    Write-Host "→ Subiendo respaldo al VPS ($VPS_HOST)..." -ForegroundColor Yellow
    scp $BACKUP_FILE "${VPS_HOST}:/tmp/sice_backup.sql"
    Write-Host "✅ Respaldo subido a /tmp/sice_backup.sql en el VPS." -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora entra a tu VPS y restaura la BD con este comando:" -ForegroundColor Cyan
    Write-Host "  ssh $VPS_HOST" -ForegroundColor White
    Write-Host "  sudo -u postgres psql -d sice_db -f /tmp/sice_backup.sql" -ForegroundColor White
} else {
    Write-Host "❌ Ocurrió un error al generar el archivo de respaldo." -ForegroundColor Red
}

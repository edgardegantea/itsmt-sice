#!/bin/bash
# =============================================================================
# SCRIPT 10 — Actualizar el despliegue vía git pull
# Ejecutar como root en el VPS: bash 10_actualizar_git.sh
# Requiere haber corrido 9_migrar_a_git.sh una vez antes.
#
# El frontend (frontend/dist) va commiteado en el repo — un simple
# `git pull` ya trae el build compilado, no hace falta Node en el VPS.
# Recuerda: en tu Mac, antes de hacer push, corre:
#   cd frontend && npm run build && git add -f dist && git commit
# =============================================================================
set -e

APP_DIR="/var/www/itsmt-sice"

echo "============================================="
echo "  SICE — Actualizando vía git pull"
echo "============================================="

cd "$APP_DIR"

# ── 1. Traer el código nuevo ────────────────────────────────────────────────
echo "→ git pull..."
sudo -u sice git pull origin main

cd "$APP_DIR/backend"

# ── 2. Dependencias PHP ─────────────────────────────────────────────────────
echo "→ Instalando dependencias PHP..."
sudo -u sice composer install --no-dev --optimize-autoloader --no-interaction

# ── 3. Migraciones ──────────────────────────────────────────────────────────
echo "→ Ejecutando migraciones pendientes..."
sudo -u sice php artisan migrate --force

# ── 4. Limpiar y reconstruir cachés ─────────────────────────────────────────
# Clave: una caché de rutas vieja produce 404/405 aunque el código
# ya esté actualizado — por eso siempre se limpia antes de reconstruir.
echo "→ Reconstruyendo cachés..."
sudo -u sice php artisan config:clear
sudo -u sice php artisan route:clear
sudo -u sice php artisan view:clear
sudo -u sice php artisan event:clear

sudo -u sice php artisan config:cache
sudo -u sice php artisan route:cache
sudo -u sice php artisan view:cache
sudo -u sice php artisan event:cache

# ── 5. Permisos (por si git pull tocó archivos) ────────────────────────────
chown -R sice:www-data "$APP_DIR/backend/storage"
chown -R sice:www-data "$APP_DIR/backend/bootstrap/cache"
chown -R www-data:www-data "$APP_DIR/frontend/dist"
chmod -R 775 "$APP_DIR/backend/storage"
chmod -R 775 "$APP_DIR/backend/bootstrap/cache"

# ── 6. Reiniciar PHP-FPM para descartar OPcache de código viejo ───────────
systemctl restart php8.3-fpm

echo ""
echo "✅ Despliegue actualizado."
echo "▶  Verifica con: bash 7_verificar.sh"

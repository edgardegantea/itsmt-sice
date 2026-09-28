#!/bin/bash
# =============================================================================
# SCRIPT 8 — Actualizar una instalación ya desplegada (no es setup inicial)
# Ejecutar como root en el VPS: bash 8_actualizar.sh
# Asume que ya corriste subir_al_vps.sh para subir el código nuevo.
# NO toca .env, Nginx ni SSL — solo trae el código al día.
# =============================================================================
set -e

BACKEND_DIR="/var/www/sice-backend"

echo "============================================="
echo "  SICE — Actualizando instalación existente"
echo "============================================="

cd "$BACKEND_DIR"

# ── 1. Dependencias PHP (vendor se excluye al subir el código) ────────────
echo "→ Instalando dependencias PHP..."
sudo -u sice composer install --no-dev --optimize-autoloader --no-interaction

# ── 2. Migraciones ─────────────────────────────────────────────────────────
echo "→ Ejecutando migraciones pendientes..."
sudo -u sice php artisan migrate --force

# ── 3. Limpiar y reconstruir cachés ────────────────────────────────────────
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

# ── 4. Permisos (por si el rsync los tocó) ────────────────────────────────
chown -R sice:www-data "$BACKEND_DIR/storage"
chown -R sice:www-data "$BACKEND_DIR/bootstrap/cache"
chmod -R 775 "$BACKEND_DIR/storage"
chmod -R 775 "$BACKEND_DIR/bootstrap/cache"

# ── 5. Reiniciar PHP-FPM para descartar OPcache de código viejo ──────────
systemctl restart php8.3-fpm

echo ""
echo "✅ Backend actualizado."
echo "   El frontend (dist) ya se sirve directamente desde /var/www/sice-frontend"
echo "   una vez que subir_al_vps.sh lo copió — no requiere reinicio de Nginx."
echo ""
echo "▶  Verifica con: bash 7_verificar.sh"

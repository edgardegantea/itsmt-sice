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

if [ -n "$1" ]; then
  APP_DIR="$1"
elif [ -d "/var/www/maewalliscorp.org/sice/itsmt-sice/.git" ]; then
  APP_DIR="/var/www/maewalliscorp.org/sice/itsmt-sice"
elif [ -d "/var/www/maewalliscorp.org/sice/.git" ]; then
  APP_DIR="/var/www/maewalliscorp.org/sice"
elif [ -d "/var/www/itsmt-sice/.git" ]; then
  APP_DIR="/var/www/itsmt-sice"
else
  APP_DIR="$(pwd)"
fi

SICE_USER=$(stat -c '%U' "$APP_DIR" 2>/dev/null || echo "sice")

echo "============================================="
echo "  SICE — Actualizando vía git pull en $APP_DIR"
echo "============================================="

cd "$APP_DIR"

# ── 1. Traer el código nuevo ────────────────────────────────────────────────
echo "→ git pull..."
sudo -u "$SICE_USER" git pull origin main || git pull origin main

cd "$APP_DIR/backend"

# ── 2. Dependencias PHP ─────────────────────────────────────────────────────
echo "→ Instalando dependencias PHP..."
sudo -u "$SICE_USER" composer install --no-dev --optimize-autoloader --no-interaction || composer install --no-dev --optimize-autoloader --no-interaction

# ── 3. Migraciones ──────────────────────────────────────────────────────────
echo "→ Ejecutando migraciones pendientes..."
sudo -u "$SICE_USER" php artisan migrate --force || php artisan migrate --force

# ── 4. Limpiar y reconstruir cachés ─────────────────────────────────────────
echo "→ Reconstruyendo cachés..."
sudo -u "$SICE_USER" php artisan config:clear || php artisan config:clear || true
sudo -u "$SICE_USER" php artisan route:clear || php artisan route:clear || true
sudo -u "$SICE_USER" php artisan view:clear || php artisan view:clear || true
sudo -u "$SICE_USER" php artisan event:clear || php artisan event:clear || true

sudo -u "$SICE_USER" php artisan config:cache || php artisan config:cache || true
sudo -u "$SICE_USER" php artisan route:cache || php artisan route:cache || true
sudo -u "$SICE_USER" php artisan view:cache || php artisan view:cache || true
sudo -u "$SICE_USER" php artisan event:cache || php artisan event:cache || true

# ── 5. Permisos (por si git pull tocó archivos) ────────────────────────────
chmod 755 "$APP_DIR"
chmod 755 "$APP_DIR/frontend"
chown -R sice:www-data "$APP_DIR/backend"
chown -R www-data:www-data "$APP_DIR/frontend/dist"
chmod -R 755 "$APP_DIR/frontend/dist"
chmod -R 775 "$APP_DIR/backend/storage"
chmod -R 775 "$APP_DIR/backend/bootstrap/cache"

# ── 6. Asegurar que Nginx apunte a la ruta correcta ────────────────────────
if [ -f /etc/nginx/sites-available/sice-frontend ]; then
  sed -i "s#root .*;#root ${APP_DIR}/frontend/dist;#" /etc/nginx/sites-available/sice-frontend
fi
if [ -f /etc/nginx/sites-available/sice-backend ]; then
  sed -i "s#root .*/public;#root ${APP_DIR}/backend/public;#" /etc/nginx/sites-available/sice-backend
  sed -i "s#alias .*/storage/app/public;#alias ${APP_DIR}/backend/storage/app/public;#" /etc/nginx/sites-available/sice-backend
fi
nginx -t && systemctl reload nginx

# ── 7. Reiniciar PHP-FPM ───────────────────────────────────────────────────
systemctl restart php8.3-fpm

echo ""
echo "✅ Despliegue actualizado."
echo "▶  Verifica con: bash 7_verificar.sh"

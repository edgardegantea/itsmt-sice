#!/bin/bash
# =============================================================================
# SCRIPT 9 — Migración ÚNICA de despliegue por rsync a despliegue por git
# Ejecutar como root en el VPS: bash 9_migrar_a_git.sh
#
# Qué hace:
#   1. Clona el repo completo (monorepo) en /var/www/itsmt-sice
#   2. Copia el .env de producción existente (nunca se toca vía git, está
#      en .gitignore) hacia la nueva ubicación
#   3. Actualiza los `root` de los dos server blocks de Nginx para que
#      apunten al checkout de git en vez de /var/www/sice-backend y
#      /var/www/sice-frontend
#   4. Corre composer install, migraciones y reconstruye cachés
#
# Después de correr este script UNA VEZ, usa 10_actualizar_git.sh para
# cada despliegue futuro (solo hace git pull + composer + migrate + caché).
#
# Los directorios /var/www/sice-backend y /var/www/sice-frontend NO se
# borran — quedan como respaldo hasta que confirmes que todo funciona.
# =============================================================================
set -e

REPO_URL="https://github.com/edgardegantea/itsmt-sice.git"
REPO_BRANCH="main"
NEW_DIR="/var/www/itsmt-sice"
OLD_BACKEND_ENV="/var/www/sice-backend/.env"

echo "============================================="
echo "  SICE — Migrando a despliegue por git"
echo "============================================="

# ── 1. Clonar el repo ──────────────────────────────────────────────────────
if [ -d "$NEW_DIR/.git" ]; then
  echo "→ $NEW_DIR ya es un repo git, se omite el clonado."
else
  echo "→ Clonando $REPO_URL en $NEW_DIR..."
  echo "   (si el repo es privado, asegúrate de tener configurado un token"
  echo "   de acceso o una llave SSH antes de continuar — git pedirá login)"
  git clone --branch "$REPO_BRANCH" "$REPO_URL" "$NEW_DIR"
fi

# ── 2. Copiar el .env de producción existente ─────────────────────────────
if [ -f "$OLD_BACKEND_ENV" ]; then
  echo "→ Copiando .env de producción existente..."
  cp "$OLD_BACKEND_ENV" "$NEW_DIR/backend/.env"
else
  echo "⚠  No se encontró $OLD_BACKEND_ENV — deberás crear"
  echo "   $NEW_DIR/backend/.env manualmente antes de continuar."
fi

# ── 3. Permisos ─────────────────────────────────────────────────────────────
echo "→ Configurando propietario y permisos..."
chown -R sice:www-data "$NEW_DIR/backend"
chown -R www-data:www-data "$NEW_DIR/frontend/dist"
chmod -R 775 "$NEW_DIR/backend/storage"
chmod -R 775 "$NEW_DIR/backend/bootstrap/cache"
chmod 640 "$NEW_DIR/backend/.env" 2>/dev/null || true

# ── 4. Dependencias PHP + storage:link ────────────────────────────────────
cd "$NEW_DIR/backend"
echo "→ Instalando dependencias PHP..."
sudo -u sice composer install --no-dev --optimize-autoloader --no-interaction
sudo -u sice php artisan storage:link || true

# ── 5. Migraciones ──────────────────────────────────────────────────────────
echo "→ Ejecutando migraciones..."
sudo -u sice php artisan migrate --force

# ── 6. Cachés ────────────────────────────────────────────────────────────────
echo "→ Reconstruyendo cachés..."
sudo -u sice php artisan config:cache
sudo -u sice php artisan route:cache
sudo -u sice php artisan view:cache
sudo -u sice php artisan event:cache

# ── 7. Actualizar Nginx para apuntar al nuevo checkout ────────────────────
echo "→ Actualizando root de Nginx (backend)..."
sed -i "s#root /var/www/sice-backend/public;#root ${NEW_DIR}/backend/public;#" \
  /etc/nginx/sites-available/sice-backend
sed -i "s#alias /var/www/sice-backend/storage/app/public;#alias ${NEW_DIR}/backend/storage/app/public;#" \
  /etc/nginx/sites-available/sice-backend

echo "→ Actualizando root de Nginx (frontend)..."
sed -i "s#root /var/www/sice-frontend;#root ${NEW_DIR}/frontend/dist;#" \
  /etc/nginx/sites-available/sice-frontend

nginx -t && systemctl reload nginx
systemctl restart php8.3-fpm

echo ""
echo "✅ Migración completa. La app ahora se sirve desde ${NEW_DIR}."
echo "   Verifica con: bash 7_verificar.sh"
echo "   /var/www/sice-backend y /var/www/sice-frontend quedaron como respaldo"
echo "   — bórralos manualmente cuando confirmes que todo funciona."
echo ""
echo "▶  De aquí en adelante, usa: bash 10_actualizar_git.sh"

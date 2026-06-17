#!/bin/bash
# =============================================================================
# SCRIPT 3 — Despliegue del backend Laravel
# Ejecutar como root: bash 3_backend.sh
# Asume que el código ya está en /var/www/sice-backend/
# =============================================================================
set -e

BACKEND_DIR="/var/www/sice-backend"
APP_URL="https://siceback.maewalliscorp.org"
FRONTEND_URL="https://sice.maewalliscorp.org"

echo "============================================="
echo "  SICE — Despliegue del backend Laravel"
echo "============================================="

# ── Leer credenciales de BD ────────────────────────────────────────────────
if [ ! -f /root/sice_db_credentials.txt ]; then
  echo "❌ Error: No se encontró /root/sice_db_credentials.txt"
  echo "   Ejecuta primero: bash 2_base_datos.sh"
  exit 1
fi
source /root/sice_db_credentials.txt

cd "$BACKEND_DIR"

# ── 1. Instalar dependencias PHP ──────────────────────────────────────────
echo "→ Instalando dependencias PHP..."
sudo -u sice composer install --no-dev --optimize-autoloader --no-interaction

# ── 2. Crear .env de producción ───────────────────────────────────────────
echo "→ Creando .env de producción..."
APP_KEY=$(sudo -u sice php artisan key:generate --show)

cat > "$BACKEND_DIR/.env" << EOF
APP_NAME="SICE - ITSMT"
APP_ENV=production
APP_KEY=${APP_KEY}
APP_DEBUG=false
APP_URL=${APP_URL}
APP_LOCALE=es
APP_FALLBACK_LOCALE=es
APP_FAKER_LOCALE=es_MX

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=error

DB_CONNECTION=${DB_CONNECTION}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_DATABASE=${DB_DATABASE}
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}

SESSION_DRIVER=database
SESSION_LIFETIME=480
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=.maewalliscorp.org
SESSION_SECURE_COOKIE=true

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=public
QUEUE_CONNECTION=database
CACHE_STORE=database

MAIL_MAILER=log
MAIL_FROM_ADDRESS="noreply@itsmt.edu.mx"
MAIL_FROM_NAME="SICE - ITSMT"

SANCTUM_STATEFUL_DOMAINS=sice.maewalliscorp.org
FRONTEND_URL=${FRONTEND_URL}

GOTENBERG_URL=http://localhost:3000
EOF

chown sice:www-data "$BACKEND_DIR/.env"
chmod 640 "$BACKEND_DIR/.env"

# ── 3. Permisos de storage y cache ────────────────────────────────────────
echo "→ Configurando permisos..."
chown -R sice:www-data "$BACKEND_DIR/storage"
chown -R sice:www-data "$BACKEND_DIR/bootstrap/cache"
chmod -R 775 "$BACKEND_DIR/storage"
chmod -R 775 "$BACKEND_DIR/bootstrap/cache"

# ── 4. Optimizar Laravel para producción ──────────────────────────────────
echo "→ Optimizando Laravel..."
sudo -u sice php artisan storage:link
sudo -u sice php artisan config:cache
sudo -u sice php artisan route:cache
sudo -u sice php artisan view:cache
sudo -u sice php artisan event:cache

# ── 5. Ejecutar migraciones ───────────────────────────────────────────────
echo "→ Ejecutando migraciones..."
sudo -u sice php artisan migrate --force

# ── 6. Configurar Nginx para el backend ───────────────────────────────────
echo "→ Configurando Nginx..."
cat > /etc/nginx/sites-available/sice-backend << 'NGINX'
server {
    listen 80;
    server_name siceback.maewalliscorp.org;
    root /var/www/sice-backend/public;
    index index.php;

    client_max_body_size 10M;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 120;
    }

    location /storage {
        alias /var/www/sice-backend/storage/app/public;
        expires 30d;
        add_header Cache-Control "public";
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # CORS para el frontend
    add_header Access-Control-Allow-Origin "https://sice.maewalliscorp.org" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;

    if ($request_method = OPTIONS) {
        return 204;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/sice-backend /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# ── 7. PHP-FPM ajustes de producción ──────────────────────────────────────
sed -i 's/^upload_max_filesize.*/upload_max_filesize = 10M/' /etc/php/8.3/fpm/php.ini
sed -i 's/^post_max_size.*/post_max_size = 10M/' /etc/php/8.3/fpm/php.ini
sed -i 's/^memory_limit.*/memory_limit = 256M/' /etc/php/8.3/fpm/php.ini
systemctl restart php8.3-fpm

echo ""
echo "✅ Backend desplegado en ${APP_URL}"
echo "▶  Continúa con: bash 4_frontend.sh"

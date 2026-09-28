#!/bin/bash
# =============================================================================
# SCRIPT DE DOMINIO ÚNICO — Configurar sice.maewalliscorp.org para Frontend + API
# Ejecutar como root: bash deploy/configurar_dominio_unico.sh
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

DOMAIN="sice.maewalliscorp.org"

echo "============================================="
echo "  SICE — Configurando Dominio Único: ${DOMAIN}"
echo "  Ruta base: ${APP_DIR}"
echo "============================================="

# 1. Permisos
chmod 755 /var/www /var/www/maewalliscorp.org /var/www/maewalliscorp.org/sice 2>/dev/null || true
chmod -R 755 "$APP_DIR"
chown -R www-data:www-data "$APP_DIR/frontend/dist"
chmod -R 775 "$APP_DIR/backend/storage"
chmod -R 775 "$APP_DIR/backend/bootstrap/cache"

# 2. Configurar Nginx Unificado (Frontend + /api + /storage en sice.maewalliscorp.org)
cat > /etc/nginx/sites-available/sice-frontend << NGINX
server {
    listen 80;
    server_name ${DOMAIN};
    root ${APP_DIR}/frontend/dist;
    index index.html;

    client_max_body_size 25M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_vary on;

    # Archivos estáticos multimedia del backend (logos, archivos subidos, etc.)
    location /storage {
        alias ${APP_DIR}/backend/storage/app/public;
        expires 30d;
        add_header Cache-Control "public";
    }

    # API Laravel Backend en la misma URL /api/
    location /api {
        alias ${APP_DIR}/backend/public;
        try_files \$uri \$uri/ /index.php?\$query_string;

        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/run/php/php8.3-fpm.sock;
            fastcgi_param SCRIPT_FILENAME ${APP_DIR}/backend/public/index.php;
            include fastcgi_params;
            fastcgi_read_timeout 300;
        }
    }

    # Assets estáticos de React
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(svg|ico|png|jpg|jpeg|webp|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public";
    }

    # SPA Router (React)
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/sice-frontend /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 3. Certbot SSL para sice.maewalliscorp.org si certbot está instalado
if command -v certbot &> /dev/null; then
  echo "→ Asegurando SSL para ${DOMAIN}..."
  certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --redirect 2>/dev/null || true
  systemctl reload nginx
fi

echo ""
echo "✅ Dominio Único Configurado Exitosamente:"
echo "   https://${DOMAIN} (Frontend SPA)"
echo "   https://${DOMAIN}/api (Backend API)"
echo "   https://${DOMAIN}/storage (Archivos y Logos)"

#!/bin/bash
# =============================================================================
# SCRIPT 4 — Despliegue del frontend React (dist estático)
# Ejecutar como root: bash 4_frontend.sh
# Asume que el dist ya está copiado a /var/www/sice-frontend/
# =============================================================================
set -e

FRONTEND_DIR="/var/www/sice-frontend"

echo "============================================="
echo "  SICE — Despliegue del frontend React"
echo "============================================="

# ── Permisos ───────────────────────────────────────────────────────────────
chown -R www-data:www-data "$FRONTEND_DIR"
chmod -R 755 "$FRONTEND_DIR"

# ── Nginx para el frontend ─────────────────────────────────────────────────
echo "→ Configurando Nginx para frontend..."
cat > /etc/nginx/sites-available/sice-frontend << 'NGINX'
server {
    listen 80;
    server_name sice.maewalliscorp.org;
    root /var/www/sice-frontend;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_vary on;

    # Assets con hash — cachear 1 año
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SVG/ico — cachear 7 días
    location ~* \.(svg|ico|png|jpg|jpeg|webp|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public";
    }

    # SPA — siempre servir index.html para rutas de React Router
    location / {
        try_files $uri $uri/ /index.html;
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

echo ""
echo "✅ Frontend configurado en http://sice.maewalliscorp.org"
echo "▶  Continúa con: bash 5_ssl.sh"

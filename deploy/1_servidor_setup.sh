#!/bin/bash
# =============================================================================
# SCRIPT 1 — Configuración inicial del servidor Ubuntu 24.04
# Ejecutar como root: bash 1_servidor_setup.sh
# =============================================================================
set -e

echo "============================================="
echo "  SICE — Configuración inicial del servidor"
echo "============================================="

# ── 1. Actualizar sistema ──────────────────────────────────────────────────
apt update && apt upgrade -y

# ── 2. Dependencias base ───────────────────────────────────────────────────
apt install -y \
  curl wget git unzip zip \
  software-properties-common \
  ca-certificates gnupg lsb-release \
  ufw fail2ban

# ── 3. PHP 8.3 + extensiones para Laravel ─────────────────────────────────
add-apt-repository ppa:ondrej/php -y
apt update
apt install -y \
  php8.3 php8.3-fpm \
  php8.3-pgsql php8.3-mbstring php8.3-xml php8.3-bcmath \
  php8.3-curl php8.3-zip php8.3-gd php8.3-intl \
  php8.3-tokenizer php8.3-ctype php8.3-fileinfo \
  php8.3-dom php8.3-redis

# ── 4. PostgreSQL 16 ────────────────────────────────────────────────────
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
apt update
apt install -y postgresql-16 postgresql-client-16

# ── 5. Nginx ────────────────────────────────────────────────────────────
apt install -y nginx

# ── 6. Composer ─────────────────────────────────────────────────────────
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# ── 7. Node.js 22 (solo para build local si se necesita) ────────────────
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# ── 8. Certbot (SSL) ────────────────────────────────────────────────────
apt install -y certbot python3-certbot-nginx

# ── 9. Docker (para Gotenberg PDF) ─────────────────────────────────────
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# ── 10. Usuario de la aplicación ────────────────────────────────────────
if ! id "sice" &>/dev/null; then
  useradd -m -s /bin/bash sice
  echo "Usuario 'sice' creado."
fi

# ── 11. Directorios del proyecto ─────────────────────────────────────────
mkdir -p /var/www/sice-backend
mkdir -p /var/www/sice-frontend
chown -R sice:www-data /var/www/sice-backend
chown -R www-data:www-data /var/www/sice-frontend
chmod -R 755 /var/www

# ── 12. Firewall ─────────────────────────────────────────────────────────
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ── 13. Fail2ban básico ──────────────────────────────────────────────────
systemctl enable fail2ban
systemctl start fail2ban

echo ""
echo "✅ Servidor configurado correctamente."
echo "   PHP:        $(php8.3 -r 'echo PHP_VERSION;')"
echo "   PostgreSQL: $(psql --version)"
echo "   Nginx:      $(nginx -v 2>&1)"
echo "   Composer:   $(composer --version)"
echo ""
echo "▶  Continúa con: bash 2_base_datos.sh"

#!/bin/bash
# =============================================================================
# SCRIPT 2 — Crear base de datos PostgreSQL para SICE
# Ejecutar como root: bash 2_base_datos.sh
# =============================================================================
set -e

# ── Parámetros (editar si es necesario) ────────────────────────────────────
DB_NAME="sice_produccion"
DB_USER="sice_user"
# Genera una contraseña aleatoria segura y la guarda
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)

echo "============================================="
echo "  SICE — Configuración de PostgreSQL"
echo "============================================="

# Asegura que PostgreSQL está corriendo
systemctl enable postgresql
systemctl start postgresql

# Crear usuario y base de datos
sudo -u postgres psql << SQL
-- Crear usuario
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE "${DB_USER}" LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

-- Crear base de datos
SELECT 'CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}" ENCODING ''UTF8'' LC_COLLATE ''es_MX.UTF-8'' LC_CTYPE ''es_MX.UTF-8'' TEMPLATE template0'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Permisos
GRANT ALL PRIVILEGES ON DATABASE "${DB_NAME}" TO "${DB_USER}";
SQL

# Configurar acceso local con contraseña (md5)
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
if ! grep -q "sice_user" "$PG_HBA"; then
  echo "host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    scram-sha-256" >> "$PG_HBA"
  systemctl reload postgresql
fi

# Guardar credenciales en archivo seguro
CREDS_FILE="/root/sice_db_credentials.txt"
cat > "$CREDS_FILE" << EOF
# ====================================
# SICE — Credenciales de base de datos
# Generadas: $(date)
# ====================================
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=${DB_NAME}
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASS}
EOF
chmod 600 "$CREDS_FILE"

echo ""
echo "✅ Base de datos configurada:"
echo "   Base de datos: ${DB_NAME}"
echo "   Usuario:       ${DB_USER}"
echo "   Contraseña:    ${DB_PASS}"
echo ""
echo "   Credenciales guardadas en: ${CREDS_FILE}"
echo ""
echo "▶  Continúa con: bash 3_backend.sh"

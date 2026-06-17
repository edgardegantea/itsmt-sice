#!/bin/bash
# =============================================================================
# Ejecutar desde tu Mac para subir el código al VPS
# Uso: bash subir_al_vps.sh <IP_DEL_VPS> [usuario]
# Ejemplo: bash subir_al_vps.sh 123.456.789.0 root
# =============================================================================
set -e

VPS_IP="${1:?Error: proporciona la IP del VPS. Ej: bash subir_al_vps.sh 123.456.789.0}"
VPS_USER="${2:-root}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "============================================="
echo "  SICE — Subiendo código al VPS"
echo "  Servidor: ${VPS_USER}@${VPS_IP}"
echo "============================================="

# ── 1. Build del frontend ──────────────────────────────────────────────────
echo ""
echo "→ Compilando frontend..."
cd "$PROJECT_DIR/frontend"

# Asegura que .env.production apunte al backend real
cat > .env.production << 'EOF'
VITE_API_URL=https://siceback.maewalliscorp.org/api
EOF

npm ci
npm run build
echo "   Frontend compilado en frontend/dist"

# ── 2. Subir scripts de deploy ─────────────────────────────────────────────
echo ""
echo "→ Subiendo scripts de deploy..."
ssh "${VPS_USER}@${VPS_IP}" "mkdir -p /root/sice-deploy"
scp "$PROJECT_DIR/deploy/"*.sh "${VPS_USER}@${VPS_IP}:/root/sice-deploy/"
ssh "${VPS_USER}@${VPS_IP}" "chmod +x /root/sice-deploy/*.sh"

# ── 3. Subir backend (excluye vendor, .env, storage/logs) ─────────────────
echo ""
echo "→ Subiendo backend (sin vendor)..."
ssh "${VPS_USER}@${VPS_IP}" "mkdir -p /var/www/sice-backend"

rsync -avz --progress \
  --exclude='.env' \
  --exclude='vendor/' \
  --exclude='node_modules/' \
  --exclude='storage/logs/*.log' \
  --exclude='storage/framework/cache/' \
  --exclude='storage/framework/sessions/' \
  --exclude='bootstrap/cache/' \
  "$PROJECT_DIR/backend/" \
  "${VPS_USER}@${VPS_IP}:/var/www/sice-backend/"

# ── 4. Subir frontend (dist compilado) ────────────────────────────────────
echo ""
echo "→ Subiendo frontend (dist)..."
ssh "${VPS_USER}@${VPS_IP}" "mkdir -p /var/www/sice-frontend"

rsync -avz --progress --delete \
  "$PROJECT_DIR/frontend/dist/" \
  "${VPS_USER}@${VPS_IP}:/var/www/sice-frontend/"

echo ""
echo "✅ Código subido correctamente."
echo ""
echo "══════════════════════════════════════════════"
echo "  Ahora en el VPS ejecuta en orden:"
echo "══════════════════════════════════════════════"
echo ""
echo "  ssh ${VPS_USER}@${VPS_IP}"
echo "  cd /root/sice-deploy"
echo ""
echo "  bash 1_servidor_setup.sh   # instala PHP, Nginx, PostgreSQL, Docker"
echo "  bash 2_base_datos.sh       # crea BD y usuario PostgreSQL"
echo "  bash 3_backend.sh          # despliega Laravel"
echo "  bash 4_frontend.sh         # configura Nginx para el frontend"
echo "  bash 5_ssl.sh              # SSL con Let's Encrypt"
echo "  bash 6_gotenberg.sh        # servicio de PDFs"
echo "  bash 7_verificar.sh        # verifica todo"
echo ""

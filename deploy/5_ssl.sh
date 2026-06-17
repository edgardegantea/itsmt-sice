#!/bin/bash
# =============================================================================
# SCRIPT 5 — SSL con Let's Encrypt (Certbot)
# Ejecutar como root: bash 5_ssl.sh
# Los dominios deben apuntar ya al servidor (DNS propagado)
# =============================================================================
set -e

EMAIL="edgar.degante.a@gmail.com"   # Correo para renovaciones

echo "============================================="
echo "  SICE — Certificados SSL (Let's Encrypt)"
echo "============================================="

# Obtener certificados para ambos dominios
certbot --nginx \
  -d siceback.maewalliscorp.org \
  -d sice.maewalliscorp.org \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --redirect

# Verificar renovación automática
certbot renew --dry-run

# Actualizar CORS en backend tras HTTPS
# (Nginx ya reescribe los headers, solo confirmamos)
systemctl reload nginx

echo ""
echo "✅ SSL configurado para:"
echo "   https://siceback.maewalliscorp.org"
echo "   https://sice.maewalliscorp.org"
echo ""
echo "▶  Continúa con: bash 6_gotenberg.sh"

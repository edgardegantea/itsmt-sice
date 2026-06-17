#!/bin/bash
# =============================================================================
# SCRIPT 7 — Verificación final del despliegue
# =============================================================================

echo "============================================="
echo "  SICE — Verificación del sistema"
echo "============================================="

OK=0
FAIL=0

check() {
  local desc="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo "  ✅ $desc"
    ((OK++)) || true
  else
    echo "  ❌ $desc"
    ((FAIL++)) || true
  fi
}

echo ""
echo "── Servicios ──────────────────────────────"
check "Nginx activo"          "systemctl is-active nginx"
check "PHP-FPM 8.3 activo"    "systemctl is-active php8.3-fpm"
check "PostgreSQL activo"     "systemctl is-active postgresql"
check "Gotenberg activo"      "systemctl is-active sice-gotenberg"
check "Docker activo"         "systemctl is-active docker"

echo ""
echo "── Conectividad ───────────────────────────"
check "Backend HTTP"          "curl -sf http://siceback.maewalliscorp.org/api/configuracion"
check "Backend HTTPS"         "curl -sf https://siceback.maewalliscorp.org/api/configuracion"
check "Frontend HTTP"         "curl -sf http://sice.maewalliscorp.org | grep -q 'SICE'"
check "Frontend HTTPS"        "curl -sf https://sice.maewalliscorp.org | grep -q 'SICE'"
check "Gotenberg health"      "curl -sf http://localhost:3000/health"

echo ""
echo "── Laravel ────────────────────────────────"
check "Config cacheada"       "test -f /var/www/sice-backend/bootstrap/cache/config.php"
check "Rutas cacheadas"       "test -f /var/www/sice-backend/bootstrap/cache/routes-v7.php"
check "Storage symlink"       "test -L /var/www/sice-backend/public/storage"
check "Storage escribible"    "test -w /var/www/sice-backend/storage/logs"

echo ""
echo "── SSL ────────────────────────────────────"
check "Cert backend válido"   "openssl s_client -connect siceback.maewalliscorp.org:443 -brief </dev/null 2>&1 | grep -q 'SSL handshake'"
check "Cert frontend válido"  "openssl s_client -connect sice.maewalliscorp.org:443 -brief </dev/null 2>&1 | grep -q 'SSL handshake'"

echo ""
echo "── Migraciones ────────────────────────────"
cd /var/www/sice-backend
PENDING=$(sudo -u sice php artisan migrate:status 2>/dev/null | grep "Pending" | wc -l)
if [ "$PENDING" -eq 0 ]; then
  echo "  ✅ Todas las migraciones aplicadas"
  ((OK++)) || true
else
  echo "  ⚠️  $PENDING migración(es) pendiente(s)"
  ((FAIL++)) || true
fi

echo ""
echo "============================================="
echo "  Resultado: ${OK} OK  /  ${FAIL} con problemas"
echo "============================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Revisa los servicios con problemas:"
  echo "  journalctl -u sice-gotenberg -n 20"
  echo "  tail -50 /var/www/sice-backend/storage/logs/laravel.log"
  echo "  nginx -t"
fi

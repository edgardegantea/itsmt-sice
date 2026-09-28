#!/bin/bash
# =============================================================================
# SCRIPT 11 — Configurar el cron del scheduler de Laravel
# Ejecutar como root en el VPS: bash 11_configurar_cron.sh
#
# routes/console.php ya registra varios Schedule::command(...) (recordatorios
# de captura, resumen semanal de asistencia, snapshot de salud semestral, cierre
# de convocatorias) pero NINGUNO de los scripts de despliegue anteriores instala
# la entrada de cron que hace que Laravel realmente los dispare — sin esto,
# `php artisan schedule:list` siempre muestra "Next Due" pero nada se ejecuta
# nunca. Idempotente: se puede correr varias veces sin duplicar la entrada.
# =============================================================================
set -e

APP_DIR="/var/www/itsmt-sice"
CRON_LINE="* * * * * cd ${APP_DIR}/backend && php8.3 artisan schedule:run >> /dev/null 2>&1"
CRON_MARKER="# sice-laravel-scheduler"

echo "============================================="
echo "  SICE — Configurando cron del scheduler"
echo "============================================="

# ── Instala la entrada en el crontab del usuario de la app (no root) ────────
CURRENT_CRON=$(sudo -u sice crontab -l 2>/dev/null || true)

if echo "$CURRENT_CRON" | grep -qF "$CRON_MARKER"; then
  echo "→ Ya existe una entrada del scheduler — no se duplica."
else
  echo "→ Agregando entrada de cron para el usuario 'sice'..."
  { echo "$CURRENT_CRON"; echo "$CRON_MARKER"; echo "$CRON_LINE"; } | sudo -u sice crontab -
  echo "✅ Cron configurado."
fi

echo ""
echo "── Verificación ────────────────────────────"
sudo -u sice crontab -l | grep -A1 "$CRON_MARKER"

echo ""
echo "▶  El scheduler corre cada minuto y decide internamente qué comandos"
echo "   le tocan a esa hora. Para confirmar que ve las tareas registradas:"
echo "     cd ${APP_DIR}/backend && sudo -u sice php8.3 artisan schedule:list"

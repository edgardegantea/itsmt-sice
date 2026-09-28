#!/bin/bash
# =============================================================================
# SCRIPT 6 — Gotenberg (generación de PDFs con Chromium headless)
# Ejecutar como root: bash 6_gotenberg.sh
# =============================================================================
set -e

echo "============================================="
echo "  SICE — Gotenberg (servicio de PDFs)"
echo "============================================="

# ── Levantar Gotenberg con Docker ─────────────────────────────────────────
docker pull gotenberg/gotenberg:8

# Crear servicio systemd para que arranque automáticamente
cat > /etc/systemd/system/sice-gotenberg.service << 'SERVICE'
[Unit]
Description=Gotenberg PDF Service para SICE
After=docker.service
Requires=docker.service

[Service]
Restart=always
RestartSec=5
ExecStartPre=-/usr/bin/docker stop sice-gotenberg
ExecStartPre=-/usr/bin/docker rm sice-gotenberg
ExecStart=/usr/bin/docker run --name sice-gotenberg \
  -p 127.0.0.1:3000:3000 \
  --restart=unless-stopped \
  gotenberg/gotenberg:8 \
  gotenberg \
  --chromium-disable-javascript=false \
  --chromium-allow-list=file:///.*
ExecStop=/usr/bin/docker stop sice-gotenberg

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable sice-gotenberg
systemctl start sice-gotenberg

# Esperar que levante
sleep 5
if curl -sf http://localhost:3000/health > /dev/null; then
  echo "✅ Gotenberg corriendo en localhost:3000"
else
  echo "⚠️  Gotenberg tardó más de lo esperado. Verifica con:"
  echo "   systemctl status sice-gotenberg"
fi

echo ""
echo "▶  Instalación completa. Verifica todo con: bash 7_verificar.sh"

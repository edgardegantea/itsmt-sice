<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #f0f4f8; padding: 32px 16px; }
    .wrap { max-width: 580px; margin: 0 auto; }
    .header { background: #1a3a5c; border-radius: 10px 10px 0 0; padding: 28px 36px; text-align: center; }
    .header .inst { color: #fff; font-size: 16px; font-weight: 700; }
    .header .sub  { color: rgba(255,255,255,.55); font-size: 12px; margin-top: 4px; }
    .banner { background: #16a34a; padding: 18px 36px; text-align: center; }
    .banner p { color: #fff; font-size: 14px; line-height: 1.6; }
    .banner strong { font-size: 15px; display: block; margin-bottom: 3px; }
    .body { background: #fff; padding: 28px 36px; }
    .body p { color: #374151; font-size: 14px; line-height: 1.75; margin-bottom: 14px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 22px; margin: 18px 0; }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #1a3a5c; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .card table { width: 100%; border-collapse: collapse; }
    .card td { padding: 5px 0; font-size: 13px; color: #374151; vertical-align: top; }
    .card td:first-child { font-weight: 600; color: #1a3a5c; width: 42%; padding-right: 12px; }
    .info-box { background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 6px 6px 0; padding: 12px 16px; margin: 16px 0; }
    .info-box p { color: #166534; font-size: 13px; margin: 0; }
    .footer { background: #1a3a5c; border-radius: 0 0 10px 10px; padding: 18px 36px; text-align: center; }
    .footer p { color: rgba(255,255,255,.50); font-size: 11px; line-height: 1.6; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="inst">Instituto Tecnológico Superior de Martínez de la Torre</div>
    <div class="sub">Control Escolar — SICE</div>
  </div>
  <div class="banner">
    <p><strong>Calendario de reinscripción disponible</strong>El periodo de reinscripción ha sido publicado.</p>
  </div>
  <div class="body">
    <p>Estimado(a) <strong>{{ $destinatarioNombre }}</strong>,</p>
    <p>El calendario de reinscripción para el siguiente periodo ha sido publicado oficialmente. A continuación encontrarás las fechas correspondientes.</p>
    <div class="card">
      <div class="card-title">Fechas de reinscripción</div>
      <table>
        <tr><td>Carrera</td><td><strong>{{ $orden->carrera?->nombre ?? '—' }}</strong></td></tr>
        <tr><td>Semestre</td><td>{{ $orden->semestre }}°</td></tr>
        <tr><td>Inicio de reinscripción</td><td>{{ \Carbon\Carbon::parse($orden->fecha_inicio_reinscripcion)->translatedFormat('d \de F \de Y') }}</td></tr>
        <tr><td>Fin de reinscripción</td><td>{{ \Carbon\Carbon::parse($orden->fecha_fin_reinscripcion)->translatedFormat('d \de F \de Y') }}</td></tr>
        <tr><td>Publicado el</td><td>{{ \Carbon\Carbon::parse($orden->publicado_en)->translatedFormat('d \de F \de Y') }}</td></tr>
      </table>
    </div>
    <div class="info-box">
      <p>📅 Recuerda que solo podrás realizar tu reinscripción dentro del periodo indicado. Fuera de esa ventana, el sistema no aceptará solicitudes para este semestre.</p>
    </div>
    <p>Ingresa al portal <strong>SICE</strong> en la sección de Trámites → Reinscripción para realizar tu solicitud.</p>
    <p style="color:#1a3a5c; font-weight:600;">Departamento de Servicios Escolares<br>Instituto Tecnológico Superior de Martínez de la Torre</p>
  </div>
  <div class="footer">
    <p>Mensaje automático generado por SICE — ITSMT. No respondas a este correo.</p>
  </div>
</div>
</body>
</html>

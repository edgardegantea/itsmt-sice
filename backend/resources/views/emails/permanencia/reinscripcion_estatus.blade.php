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
    .banner-ok  { background: #16a34a; padding: 18px 36px; text-align: center; }
    .banner-err { background: #dc2626; padding: 18px 36px; text-align: center; }
    .banner-ok p, .banner-err p { color: #fff; font-size: 14px; line-height: 1.6; }
    .banner-ok strong, .banner-err strong { font-size: 15px; display: block; margin-bottom: 3px; }
    .body { background: #fff; padding: 28px 36px; }
    .body p { color: #374151; font-size: 14px; line-height: 1.75; margin-bottom: 14px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 22px; margin: 18px 0; }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #1a3a5c; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .card table { width: 100%; border-collapse: collapse; }
    .card td { padding: 5px 0; font-size: 13px; color: #374151; vertical-align: top; }
    .card td:first-child { font-weight: 600; color: #1a3a5c; width: 42%; padding-right: 12px; }
    .footer { background: #1a3a5c; border-radius: 0 0 10px 10px; padding: 18px 36px; text-align: center; }
    .footer p { color: rgba(255,255,255,.50); font-size: 11px; line-height: 1.6; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="inst">Instituto Tecnológico Superior de Martínez de la Torre</div>
    <div class="sub">Servicios Escolares — SICE</div>
  </div>
  @if($reinscripcion->estatus === 'aprobada')
  <div class="banner-ok">
    <p><strong>Reinscripción aprobada</strong>Tu solicitud de reinscripción ha sido aprobada.</p>
  </div>
  @else
  <div class="banner-err">
    <p><strong>Reinscripción rechazada</strong>Tu solicitud de reinscripción no fue aprobada.</p>
  </div>
  @endif
  <div class="body">
    <p>Estimado(a) <strong>{{ $reinscripcion->alumno?->user?->name ?? 'alumno(a)' }}</strong>,</p>
    <p>
      @if($reinscripcion->estatus === 'aprobada')
        Tu solicitud de reinscripción para el periodo indicado ha sido <strong>aprobada</strong>. Recuerda obtener tu sticker de reinscripción en Control Escolar.
      @else
        Tu solicitud de reinscripción para el periodo indicado ha sido <strong>rechazada</strong>. Para más información acude al Departamento de Servicios Escolares.
      @endif
    </p>
    <div class="card">
      <div class="card-title">Detalles</div>
      <table>
        <tr><td>Número de control</td><td>{{ $reinscripcion->alumno?->numero_control ?? '—' }}</td></tr>
        <tr><td>Periodo</td><td>{{ $reinscripcion->periodo?->nombre ?? '—' }}</td></tr>
        <tr><td>Estatus</td><td>{{ ucfirst($reinscripcion->estatus) }}</td></tr>
        @if($reinscripcion->observaciones)
        <tr><td>Observaciones</td><td>{{ $reinscripcion->observaciones }}</td></tr>
        @endif
      </table>
    </div>
    <p style="color:#1a3a5c; font-weight:600;">Departamento de Servicios Escolares<br>Instituto Tecnológico Superior de Martínez de la Torre</p>
  </div>
  <div class="footer">
    <p>Mensaje automático generado por SICE — ITSMT. No respondas a este correo.</p>
  </div>
</div>
</body>
</html>

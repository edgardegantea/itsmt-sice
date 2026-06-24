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
    .banner { background: #2563eb; padding: 18px 36px; text-align: center; }
    .banner p { color: #fff; font-size: 14px; line-height: 1.6; }
    .banner strong { font-size: 15px; display: block; margin-bottom: 3px; }
    .body { background: #fff; padding: 28px 36px; }
    .body p { color: #374151; font-size: 14px; line-height: 1.75; margin-bottom: 14px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 22px; margin: 18px 0; }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #1a3a5c; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .card table { width: 100%; border-collapse: collapse; }
    .card td { padding: 5px 0; font-size: 13px; color: #374151; vertical-align: top; }
    .card td:first-child { font-weight: 600; color: #1a3a5c; width: 40%; padding-right: 12px; }
    .info-box { background: #fef9c3; border-left: 4px solid #ca8a04; border-radius: 0 6px 6px 0; padding: 12px 16px; margin: 16px 0; }
    .info-box p { color: #713f12; font-size: 13px; margin: 0; }
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
    <p><strong>Nueva solicitud de constancia</strong>Un alumno ha solicitado una constancia escolar.</p>
  </div>
  <div class="body">
    <p>Se ha registrado una nueva solicitud de constancia que requiere tu atención en el módulo de <strong>Control Escolar → Constancias</strong>.</p>
    <div class="card">
      <div class="card-title">Detalles de la solicitud</div>
      <table>
        <tr><td>Alumno</td><td>{{ $constancia->alumno?->user?->name ?? '—' }}</td></tr>
        <tr><td>Número de control</td><td>{{ $constancia->alumno?->numero_control ?? '—' }}</td></tr>
        <tr><td>Carrera</td><td>{{ $constancia->alumno?->carrera?->nombre ?? '—' }}</td></tr>
        <tr><td>Tipo de constancia</td><td>
          @php
            $tipos = ['estudios' => 'Constancia de estudios', 'inscripcion' => 'Constancia de inscripción', 'calificaciones' => 'Constancia de calificaciones'];
          @endphp
          {{ $tipos[$constancia->tipo] ?? $constancia->tipo }}
        </td></tr>
        <tr><td>Folio</td><td>{{ $constancia->folio_unico }}</td></tr>
        <tr><td>Fecha de solicitud</td><td>{{ $constancia->created_at->translatedFormat('d \de F \de Y') }}</td></tr>
      </table>
    </div>
    <div class="info-box">
      <p>⚠️ Ingresa a <strong>Control Escolar → Constancias</strong> para emitir el documento y notificar al alumno.</p>
    </div>
  </div>
  <div class="footer">
    <p>Mensaje automático generado por SICE — ITSMT. No respondas a este correo.</p>
  </div>
</div>
</body>
</html>

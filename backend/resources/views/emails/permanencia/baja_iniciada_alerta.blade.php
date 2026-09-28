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
    .banner { background: #b45309; padding: 18px 36px; text-align: center; }
    .banner p { color: #fff; font-size: 14px; line-height: 1.6; }
    .banner strong { font-size: 15px; display: block; margin-bottom: 3px; }
    .body { background: #fff; padding: 28px 36px; }
    .body p { color: #374151; font-size: 14px; line-height: 1.75; margin-bottom: 14px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 22px; margin: 18px 0; }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #1a3a5c; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .card table { width: 100%; border-collapse: collapse; }
    .card td { padding: 5px 0; font-size: 13px; color: #374151; vertical-align: top; }
    .card td:first-child { font-weight: 600; color: #1a3a5c; width: 42%; padding-right: 12px; }
    .info-box { background: #fffbeb; border-left: 4px solid #d97706; border-radius: 0 6px 6px 0; padding: 12px 16px; margin: 16px 0; }
    .info-box p { color: #92400e; font-size: 13px; margin: 0; }
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
  <div class="banner">
    <p><strong>Se inició un trámite de baja</strong>Un miembro del personal académico lo registró sobre tu expediente.</p>
  </div>
  <div class="body">
    <p>Estimado(a) <strong>{{ $baja->alumno?->user?->name ?? 'alumno(a)' }}</strong>,</p>
    <p>Se ha iniciado un trámite de {{ $baja->tipo_baja === 'definitiva' ? 'baja definitiva' : 'baja temporal' }} sobre tu expediente, a partir de una señal de seguimiento académico detectada por el sistema. Este trámite queda <strong>pendiente de revisión</strong> — todavía no se aplica ningún cambio a tu estatus.</p>
    <div class="card">
      <div class="card-title">Detalles del trámite</div>
      <table>
        <tr><td>Número de control</td><td>{{ $baja->alumno?->numero_control ?? '—' }}</td></tr>
        <tr><td>Periodo</td><td>{{ $baja->periodo?->nombre ?? '—' }}</td></tr>
        <tr><td>Tipo de baja</td><td>{{ $baja->tipo_baja === 'definitiva' ? 'Definitiva' : 'Temporal' }}</td></tr>
        <tr><td>Fecha</td><td>{{ \Carbon\Carbon::parse($baja->fecha_solicitud)->translatedFormat('d \de F \de Y') }}</td></tr>
      </table>
    </div>
    <div class="info-box">
      <p>📋 Acude a <strong>Control Escolar</strong> o con tu jefe de carrera lo antes posible para revisar tu situación académica antes de que el trámite sea resuelto.</p>
    </div>
    <p>Si tienes alguna duda, comunícate con el Departamento de Servicios Escolares del ITSMT.</p>
    <p style="color:#1a3a5c; font-weight:600;">Departamento de Servicios Escolares<br>Instituto Tecnológico Superior de Martínez de la Torre</p>
  </div>
  <div class="footer">
    <p>Mensaje automático generado por SICE — ITSMT. No respondas a este correo.</p>
  </div>
</div>
</body>
</html>

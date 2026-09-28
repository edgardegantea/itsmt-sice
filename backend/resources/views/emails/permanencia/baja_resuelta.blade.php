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
    .banner { background: {{ $baja->estatus === 'aprobada' ? '#15803d' : '#b91c1c' }}; padding: 18px 36px; text-align: center; }
    .banner p { color: #fff; font-size: 14px; line-height: 1.6; }
    .banner strong { font-size: 15px; display: block; margin-bottom: 3px; }
    .body { background: #fff; padding: 28px 36px; }
    .body p { color: #374151; font-size: 14px; line-height: 1.75; margin-bottom: 14px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 22px; margin: 18px 0; }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #1a3a5c; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .card table { width: 100%; border-collapse: collapse; }
    .card td { padding: 5px 0; font-size: 13px; color: #374151; vertical-align: top; }
    .card td:first-child { font-weight: 600; color: #1a3a5c; width: 42%; padding-right: 12px; }
    .info-box { background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 0 6px 6px 0; padding: 12px 16px; margin: 16px 0; }
    .info-box p { color: #1e40af; font-size: 13px; margin: 0; }
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
    @if($baja->estatus === 'aprobada')
      <p><strong>Solicitud de baja aprobada</strong>Tu estatus en el sistema ya fue actualizado.</p>
    @else
      <p><strong>Solicitud de baja rechazada</strong>Tu trámite no procedió — revisa el motivo abajo.</p>
    @endif
  </div>
  <div class="body">
    <p>Estimado(a) <strong>{{ $baja->alumno?->user?->name ?? 'alumno(a)' }}</strong>,</p>
    @if($baja->estatus === 'aprobada')
      <p>Tu solicitud de {{ $baja->tipo_baja === 'definitiva' ? 'baja definitiva' : 'baja temporal' }} fue <strong>aprobada</strong>. Tu estatus en el Sistema Integral de Control Escolar ya refleja este cambio.</p>
    @else
      <p>Tu solicitud de {{ $baja->tipo_baja === 'definitiva' ? 'baja definitiva' : 'baja temporal' }} fue <strong>rechazada</strong>. Tu estatus académico no cambia.</p>
    @endif
    <div class="card">
      <div class="card-title">Detalles</div>
      <table>
        <tr><td>Número de control</td><td>{{ $baja->alumno?->numero_control ?? '—' }}</td></tr>
        <tr><td>Periodo</td><td>{{ $baja->periodo?->nombre ?? '—' }}</td></tr>
        <tr><td>Tipo de baja</td><td>{{ $baja->tipo_baja === 'definitiva' ? 'Definitiva' : 'Temporal' }}</td></tr>
        <tr><td>Resolución</td><td>{{ \Carbon\Carbon::parse($baja->revisada_en)->translatedFormat('d \de F \de Y') }}</td></tr>
        @if($baja->estatus === 'rechazada' && $baja->motivo_rechazo)
        <tr><td>Motivo del rechazo</td><td>{{ $baja->motivo_rechazo }}</td></tr>
        @endif
        @if($baja->estatus === 'aprobada' && $baja->tipo_baja === 'temporal' && $baja->reingreso_posible)
        <tr><td>Reingreso</td><td>Disponible — acude a Control Escolar cuando quieras reincorporarte.</td></tr>
        @endif
      </table>
    </div>
    @if($baja->estatus === 'aprobada')
    <div class="info-box">
      <p>📋 Si tu baja es temporal, acude a <strong>Control Escolar</strong> cuando estés listo(a) para formalizar tu reingreso.</p>
    </div>
    @endif
    <p>Si tienes alguna duda, comunícate con el Departamento de Servicios Escolares del ITSMT.</p>
    <p style="color:#1a3a5c; font-weight:600;">Departamento de Servicios Escolares<br>Instituto Tecnológico Superior de Martínez de la Torre</p>
  </div>
  <div class="footer">
    <p>Mensaje automático generado por SICE — ITSMT. No respondas a este correo.</p>
  </div>
</div>
</body>
</html>

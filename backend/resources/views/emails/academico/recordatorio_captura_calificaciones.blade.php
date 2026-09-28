<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Captura de calificaciones pendiente</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#1a3a5c;">Captura de calificaciones pendiente</h2>
  <p>Hola {{ $alerta->docente?->name }},</p>
  <p>
    El corte de captura <strong>#{{ $alerta->corteCaptura?->numero }}</strong>
    @if($alerta->corteCaptura?->fecha_limite_captura)
      (fecha límite: {{ \Illuminate\Support\Carbon::parse($alerta->corteCaptura->fecha_limite_captura)->format('d/m/Y') }})
    @endif
    de <strong>{{ $alerta->cargaAcademica?->materia?->nombre ?? 'tu materia' }}</strong>
    todavía tiene calificaciones sin capturar.
  </p>
  <table style="border-collapse:collapse;margin:16px 0;">
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Avance capturado:</td>
      <td style="padding:4px 0;font-weight:bold;">{{ $alerta->porcentaje_capturado }}%</td>
    </tr>
    @if($alerta->unidades_esperadas)
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Unidades esperadas a este corte:</td>
      <td style="padding:4px 0;font-weight:bold;">{{ $alerta->unidades_esperadas }} de {{ $alerta->total_unidades_temario }}</td>
    </tr>
    @endif
  </table>
  <p>Por favor completa la captura antes de la fecha límite para evitar inconsistencias en el libro de calificaciones.</p>
  <hr style="margin-top:20px;">
  <p style="font-size:12px;color:#777;">
    ITSMT — Sistema Institucional de Control Escolar.
    Este es un recordatorio automático; no responder a este correo.
  </p>
</body>
</html>

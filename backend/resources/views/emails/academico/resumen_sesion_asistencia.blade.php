@php
  $asistencias = $sesion->asistencias()->with('alumno')->get();
  $ESTATUS_LABEL = ['presente' => 'Presente', 'ausente' => 'Ausente', 'retardo' => 'Retardo', 'justificado' => 'Justificado'];
  $ESTATUS_COLOR = ['presente' => 'green', 'ausente' => 'red', 'retardo' => '#b8860b', 'justificado' => '#1a3a5c'];
@endphp
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Resumen de asistencia</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#1a3a5c;">Resumen de asistencia</h2>
  <p>Hola {{ $sesion->docente?->name }},</p>
  <p>Este es el resumen de asistencia de la sesión del <strong>{{ $sesion->fecha?->format('d/m/Y') }}</strong>
    ({{ $sesion->hora_inicio }}–{{ $sesion->hora_fin }})@if($sesion->tema) — {{ $sesion->tema }}@endif.</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
    <thead>
      <tr style="background:#1a3a5c;color:#fff;">
        <th style="padding:6px 8px;text-align:left;">Alumno</th>
        <th style="padding:6px 8px;text-align:center;">Estatus</th>
      </tr>
    </thead>
    <tbody>
      @foreach($asistencias as $a)
        <tr style="border-bottom:1px solid #e0e0e0;">
          <td style="padding:6px 8px;">{{ $a->alumno?->name ?? '—' }}</td>
          <td style="padding:6px 8px;text-align:center;color:{{ $ESTATUS_COLOR[$a->estatus] ?? '#333' }};font-weight:bold;">
            {{ $ESTATUS_LABEL[$a->estatus] ?? $a->estatus }}
          </td>
        </tr>
      @endforeach
    </tbody>
  </table>
  <hr style="margin-top:16px;">
  <p style="font-size:12px;color:#777;">ITSMT — Sistema Institucional de Control Escolar</p>
</body>
</html>

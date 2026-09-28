<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Resumen semanal de asistencia</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#1a3a5c;">Tu resumen semanal de asistencia</h2>
  <p>Hola {{ $docente->name }},</p>
  <p>Así quedó el pase de lista de tus grupos esta semana:</p>

  <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="text-align:left;padding:6px 8px;">Materia</th>
        <th style="text-align:left;padding:6px 8px;">Grupo</th>
        <th style="text-align:center;padding:6px 8px;">Sesiones</th>
      </tr>
    </thead>
    <tbody>
      @foreach($detalle as $fila)
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:6px 8px;">{{ $fila['materia'] }}</td>
          <td style="padding:6px 8px;">{{ $fila['grupo'] }}</td>
          <td style="padding:6px 8px;text-align:center;">
            {{ $fila['registradas'] }}/{{ $fila['esperadas'] }}
            <span style="color:{{ $fila['pct'] >= 100 ? '#059669' : ($fila['pct'] >= 50 ? '#b45309' : '#dc2626') }};">
              ({{ $fila['pct'] }}%)
            </span>
          </td>
        </tr>
      @endforeach
    </tbody>
  </table>

  <p>
    <strong>Total de la semana:</strong>
    {{ $totalRegistradas }} de {{ $totalEsperadas }} sesiones registradas
    (<span style="color:{{ $pctGeneral >= 100 ? '#059669' : ($pctGeneral >= 50 ? '#b45309' : '#dc2626') }};font-weight:bold;">{{ $pctGeneral }}%</span>).
  </p>

  @if($pctGeneral < 100)
    <p style="color:#555;">Si alguna sesión no se registró por un motivo justificado (suspensión, día no laborable, etc.), no necesitas hacer nada; este resumen es solo informativo.</p>
  @endif

  <hr style="margin-top:20px;">
  <p style="font-size:12px;color:#777;">
    ITSMT — Sistema Institucional de Control Escolar.
    Este es un resumen automático semanal; no responder a este correo.
  </p>
</body>
</html>

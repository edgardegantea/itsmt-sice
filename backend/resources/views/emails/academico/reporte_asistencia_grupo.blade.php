<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Reporte acumulado de asistencia</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#1a3a5c;">Reporte acumulado de asistencia</h2>
  <p>Hola {{ $carga->docente?->name }},</p>
  <p>Este es el reporte acumulado de asistencia de <strong>{{ $carga->materia?->nombre }}</strong>
    ({{ $totalSesiones }} sesión(es) registradas).</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
    <thead>
      <tr style="background:#1a3a5c;color:#fff;">
        <th style="padding:6px 8px;text-align:left;">Alumno</th>
        <th style="padding:6px 8px;text-align:center;">Presentes</th>
        <th style="padding:6px 8px;text-align:center;">Ausentes</th>
        <th style="padding:6px 8px;text-align:center;">Retardos</th>
        <th style="padding:6px 8px;text-align:center;">% Inasistencia</th>
      </tr>
    </thead>
    <tbody>
      @foreach($resumenAlumnos as $r)
        <tr style="border-bottom:1px solid #e0e0e0;">
          <td style="padding:6px 8px;">{{ $r['nombre'] }}</td>
          <td style="padding:6px 8px;text-align:center;">{{ $r['presentes'] }}</td>
          <td style="padding:6px 8px;text-align:center;">{{ $r['ausentes'] }}</td>
          <td style="padding:6px 8px;text-align:center;">{{ $r['retardos'] }}</td>
          <td style="padding:6px 8px;text-align:center;color:{{ $r['porcentaje_inasistencia'] >= 25 ? 'red' : '#333' }};font-weight:bold;">
            {{ $r['porcentaje_inasistencia'] }}%
          </td>
        </tr>
      @endforeach
    </tbody>
  </table>
  <hr style="margin-top:16px;">
  <p style="font-size:12px;color:#777;">ITSMT — Sistema Institucional de Control Escolar</p>
</body>
</html>

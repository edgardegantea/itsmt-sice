<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Ya puedes cargar calificaciones</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#1a3a5c;">Ya puedes cargar calificaciones</h2>
  <p>Hola {{ $planeacion->docente?->name }},</p>
  <p>
    Según la dosificación de tu instrumentación didáctica, esta semana (semana {{ $semanaEvaluacion }} del periodo
    {{ $planeacion->periodo?->nombre }}) es la semana de holgura para evaluar y cargar las calificaciones de la:
  </p>
  <table style="border-collapse:collapse;margin:16px 0;">
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Materia:</td>
      <td style="padding:4px 0;font-weight:bold;">{{ $planeacion->cargaAcademica?->materia?->nombre ?? 'tu materia' }}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Unidad:</td>
      <td style="padding:4px 0;font-weight:bold;">
        Unidad {{ $numeroUnidad }}@if($nombreUnidad) — {{ $nombreUnidad }}@endif
      </td>
    </tr>
  </table>
  <p>
    <a href="{{ rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/') }}/docente/calificaciones"
       style="display:inline-block;background:#1a3a5c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;">
      Ir a Captura de Calificaciones
    </a>
  </p>
  <hr style="margin-top:20px;">
  <p style="font-size:12px;color:#777;">
    ITSMT — Sistema Institucional de Control Escolar.
    Este es un recordatorio automático generado a partir de tu propia dosificación; no responder a este correo.
  </p>
</body>
</html>

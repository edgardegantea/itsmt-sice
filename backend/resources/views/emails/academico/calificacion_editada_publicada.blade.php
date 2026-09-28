<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Calificación editada</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#b91c1c;">Calificación editada después de publicada</h2>
  <p>Se modificó una calificación que ya estaba publicada — puede requerir revisión.</p>
  <table style="border-collapse:collapse;margin:16px 0;">
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Alumno:</td>
      <td style="padding:4px 0;font-weight:bold;">{{ $calificacion->alumno?->user?->name ?? $calificacion->alumno_id }}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Materia:</td>
      <td style="padding:4px 0;font-weight:bold;">{{ $calificacion->cargaAcademica?->materia?->nombre ?? '—' }}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Grupo:</td>
      <td style="padding:4px 0;font-weight:bold;">{{ $calificacion->grupo?->clave ?? '—' }}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Editado por:</td>
      <td style="padding:4px 0;font-weight:bold;">{{ $editor->name }}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Fecha:</td>
      <td style="padding:4px 0;">{{ now()->format('d/m/Y H:i') }}</td>
    </tr>
  </table>
  <p>Puedes revisar el historial completo de ediciones de este grupo en el sistema.</p>
  <hr style="margin-top:20px;">
  <p style="font-size:12px;color:#777;">
    ITSMT — Sistema Institucional de Control Escolar. Aviso automático, no responder a este correo.
  </p>
</body>
</html>

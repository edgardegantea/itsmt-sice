<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Acta de calificaciones generada</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#1a3a5c;">Acta de calificaciones generada</h2>
  <p>Un docente generó un acta de calificaciones y está disponible para firma.</p>
  <table style="border-collapse:collapse;margin:16px 0;">
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Materia:</td>
      <td style="padding:4px 0;font-weight:bold;">{{ $acta->cargaAcademica?->materia?->nombre ?? '—' }}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Grupo:</td>
      <td style="padding:4px 0;font-weight:bold;">{{ $acta->grupo?->clave ?? '—' }}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Docente:</td>
      <td style="padding:4px 0;font-weight:bold;">{{ $acta->generadoPor?->name ?? '—' }}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Folio:</td>
      <td style="padding:4px 0;font-weight:bold;">{{ $acta->folio }}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Fecha:</td>
      <td style="padding:4px 0;">{{ $acta->generado_en?->format('d/m/Y H:i') }}</td>
    </tr>
  </table>
  <p>Puedes descargarla y firmarla desde el sistema.</p>
  <hr style="margin-top:20px;">
  <p style="font-size:12px;color:#777;">
    ITSMT — Sistema Institucional de Control Escolar. Aviso automático, no responder a este correo.
  </p>
</body>
</html>

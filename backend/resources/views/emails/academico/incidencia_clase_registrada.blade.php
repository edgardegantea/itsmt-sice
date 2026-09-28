<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Incidencia de clase reportada</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#1a3a5c;">Prefectura reportó una incidencia en tu clase</h2>
  <p>Hola {{ $incidencia->docente?->name }},</p>
  <p>
    Durante una ronda de verificación, prefectura registró lo siguiente sobre tu grupo
    <strong>{{ $incidencia->grupo?->clave }}</strong>
    ({{ $incidencia->grupo?->carrera?->nombre }}):
  </p>
  <table style="border-collapse:collapse;margin:16px 0;">
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Fecha / hora:</td>
      <td style="padding:4px 0;font-weight:bold;">
        {{ \Illuminate\Support\Carbon::parse($incidencia->fecha)->format('d/m/Y') }} · {{ substr($incidencia->hora_revision, 0, 5) }}
      </td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Materia esperada:</td>
      <td style="padding:4px 0;font-weight:bold;">{{ $incidencia->cargaAcademica?->materia?->nombre ?? '—' }}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#777;">Resultado:</td>
      <td style="padding:4px 0;font-weight:bold;color:#b45309;">
        {{ [
          'docente_ausente' => 'Docente ausente',
          'aula_vacia' => 'Aula vacía',
          'grupo_incorrecto' => 'Grupo incorrecto',
          'aula_incorrecta' => 'Aula incorrecta',
          'alumnos_incompletos' => 'Alumnos incompletos',
          'otro' => 'Otro',
        ][$incidencia->estatus] ?? $incidencia->estatus }}
      </td>
    </tr>
  </table>
  @if($incidencia->observaciones)
    <p style="color:#555;"><strong>Observaciones:</strong> {{ $incidencia->observaciones }}</p>
  @endif
  <p>Si consideras que esto requiere una aclaración, contacta a tu jefe de carrera.</p>
  <hr style="margin-top:20px;">
  <p style="font-size:12px;color:#777;">
    ITSMT — Sistema Institucional de Control Escolar.
    Este es un aviso automático; no responder a este correo.
  </p>
</body>
</html>

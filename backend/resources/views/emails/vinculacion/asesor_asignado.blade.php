<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Asesor Interno asignado</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  @if($paraAsesor)
    <h2 style="color:#1a3a5c;">Se te asignó como Asesor Interno</h2>
    <p>Hola {{ $residencia->asesor?->name }},</p>
    <p>Se te asignó como Asesor Interno de la Residencia Profesional de <strong>{{ $residencia->alumno?->user?->name }}</strong> ({{ $residencia->alumno?->numero_control }}) en la empresa <strong>{{ $residencia->empresa }}</strong>.</p>
  @else
    <h2 style="color:#1a3a5c;">Se asignó tu Asesor Interno</h2>
    <p>Hola {{ $residencia->alumno?->user?->name }},</p>
    <p>Tu Asesor Interno de Residencia Profesional es <strong>{{ $residencia->asesor?->name }}</strong>.</p>
  @endif
  <p>Se generará el Oficio de Asignación (TecNM-AC-PO-004-02) correspondiente.</p>
  <hr>
  <p style="font-size:12px;color:#777;">ITSMT — Sistema Institucional de Control Escolar</p>
</body>
</html>

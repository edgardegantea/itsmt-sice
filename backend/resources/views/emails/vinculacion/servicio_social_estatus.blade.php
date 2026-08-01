<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Servicio Social actualizado</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#1a3a5c;">Actualización de tu Servicio Social</h2>
  <p>Hola {{ $servicioSocial->alumno?->user?->name }},</p>
  <p>El estatus de tu Servicio Social en <strong>{{ $servicioSocial->empresa }}</strong> ha cambiado a:</p>
  <p style="font-size:18px;font-weight:bold;color:#1a3a5c;text-transform:uppercase;">{{ $servicioSocial->estatus }}</p>
  @if($servicioSocial->estatus === 'acreditado')
    <p>Se te otorgaron <strong>{{ $servicioSocial->creditos_otorgados }} créditos</strong>.</p>
  @endif
  <p>Consulta el detalle en el portal del alumno.</p>
  <hr>
  <p style="font-size:12px;color:#777;">ITSMT — Sistema Institucional de Control Escolar</p>
</body>
</html>

<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Resultado de admisión</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#1a3a5c;">Resultado de tu solicitud, {{ $aspirante->nombres }}</h2>
  <p>Lamentamos informarte que tu solicitud de admisión al <strong>Instituto Tecnológico Superior de Misantla</strong> no pudo ser <strong style="color:#c00;">aprobada</strong> en esta ocasión.</p>
  @if($aspirante->motivo_rechazo)
  <p><strong>Motivo:</strong> {{ $aspirante->motivo_rechazo }}</p>
  @endif
  <p>Si tienes dudas, comunícate con Control Escolar.</p>
  <hr>
  <p style="font-size:12px;color:#777;">ITSMT — Sistema Institucional de Control Escolar</p>
</body>
</html>

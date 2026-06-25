<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Admisión aceptada</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#1a3a5c;">¡Felicidades, {{ $aspirante->nombres }}!</h2>
  <p>Nos complace informarte que tu solicitud de admisión al <strong>Instituto Tecnológico Superior de Misantla</strong> ha sido <strong style="color:green;">ACEPTADA</strong>.</p>
  <p><strong>Carrera:</strong> {{ $aspirante->carrera?->nombre ?? '—' }}</p>
  <p>Por favor acude a Control Escolar con tu documentación completa para continuar con tu proceso de inscripción.</p>
  <hr>
  <p style="font-size:12px;color:#777;">ITSMT — Sistema Institucional de Control Escolar</p>
</body>
</html>

<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Lista de asistencia</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#1a3a5c;">Lista de asistencia</h2>
  <p>Hola {{ $carga->docente?->name }},</p>
  <p>Adjunta encontrarás la lista de asistencia en blanco de tu materia <strong>{{ $carga->materia?->nombre }}</strong> para que la utilices en clase.</p>
  <hr>
  <p style="font-size:12px;color:#777;">ITSMT — Sistema Institucional de Control Escolar</p>
</body>
</html>

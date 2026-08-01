@php
  $grupo = $carga->grupos->first();
  $gruposClave = $carga->grupos->pluck('clave')->implode(', ');
  $frontendUrl = rtrim(config('app.frontend_url'), '/');
  $link = $grupo
    ? "{$frontendUrl}/admin/gestion-academica/asistencias/pase/{$carga->id}?periodo={$carga->periodo_id}"
    : null;
@endphp
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Recordatorio de asistencia</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#1a3a5c;">Tu clase empieza en 10 minutos</h2>
  <p>Hola {{ $carga->docente?->name }},</p>
  <p>
    Tu clase de <strong>{{ $carga->materia?->nombre }}</strong>
    (Grupo{{ $carga->grupos->count() > 1 ? 's' : '' }} {{ $gruposClave }})
    inicia a las <strong>{{ substr($horario->hora_inicio, 0, 5) }}</strong>.
  </p>
  <p>No olvides pasar lista al inicio de la sesión.</p>
  @if($link)
    <p style="margin-top:20px;">
      <a href="{{ $link }}" style="background:#1a3a5c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">
        Pasar lista ahora
      </a>
    </p>
  @endif
  <hr style="margin-top:20px;">
  <p style="font-size:12px;color:#777;">
    ITSMT — Sistema Institucional de Control Escolar.
    Puedes desactivar estos recordatorios desde tu perfil o pidiéndoselo al administrador del sistema.
  </p>
</body>
</html>

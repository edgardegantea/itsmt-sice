<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecimiento de contraseña — ITSMT</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 32px 16px; color: #334155; }
    .card { background: #fff; max-width: 520px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #1a3a5c; padding: 28px 32px; }
    .header p { color: #fff; margin: 0; font-size: 18px; font-weight: 700; letter-spacing: .5px; }
    .header span { color: rgba(255,255,255,.5); font-size: 13px; font-weight: 400; }
    .body { padding: 32px; }
    .body p { margin: 0 0 16px; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; background: #1a3a5c; color: #fff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 8px 0 20px; }
    .note { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; font-size: 13px; color: #64748b; }
    .footer { text-align: center; padding: 20px 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    .url { word-break: break-all; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <p>SICE — ITSMT <span>/ Control Escolar</span></p>
    </div>
    <div class="body">
      <p>Hola, <strong>{{ $nombreAlumno }}</strong>.</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de estudiante. Haz clic en el botón para crear una nueva contraseña:</p>

      <a href="{{ $resetUrl }}" class="btn">Restablecer mi contraseña</a>

      <div class="note">
        <strong>Este enlace expira en 60 minutos.</strong><br>
        Si no solicitaste este cambio, ignora este correo. Tu contraseña actual seguirá siendo tu CURP en mayúsculas.
      </div>

      <p style="margin-top:20px;font-size:13px;color:#64748b;">
        Si el botón no funciona, copia y pega esta URL en tu navegador:
      </p>
      <p class="url">{{ $resetUrl }}</p>
    </div>
    <div class="footer">
      Instituto Tecnológico Superior de Martínez de la Torre &mdash; SICE © {{ date('Y') }}
    </div>
  </div>
</body>
</html>

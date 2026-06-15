<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 40px 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #1a3a5c; padding: 28px 32px; }
    .header h1 { color: #fff; font-size: 18px; margin: 0; font-weight: 600; }
    .header p { color: rgba(255,255,255,.6); font-size: 12px; margin: 4px 0 0; }
    .body { padding: 32px; }
    .body p { color: #374151; font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
    .dato { background: #f8fafc; border-radius: 6px; padding: 16px 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
    .dato table { width: 100%; border-collapse: collapse; }
    .dato td { padding: 5px 0; font-size: 13px; color: #374151; }
    .dato td:first-child { font-weight: 600; color: #1a3a5c; width: 40%; }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Instituto Tecnológico Superior de Martínez de la Torre</h1>
      <p>Sistema Integral de Control Escolar</p>
    </div>

    <div class="body">
      <p>Estimado(a) <strong>{{ $aspirante->nombres }} {{ $aspirante->apellido_paterno }}</strong>,</p>

      <p>Hemos recibido tu solicitud de admisión. A continuación se detallan los datos registrados:</p>

      <div class="dato">
        <table>
          <tr><td>Carrera solicitada</td><td>{{ $aspirante->carrera->nombre }}</td></tr>
          <tr><td>Periodo</td><td>{{ $aspirante->periodo->nombre }}</td></tr>
          <tr><td>Correo registrado</td><td>{{ $aspirante->email }}</td></tr>
          <tr><td>Estatus</td><td>Pendiente de revisión</td></tr>
        </table>
      </div>

      <p>El área de <strong>Control Escolar</strong> revisará tu expediente y te notificará el resultado de tu solicitud. Este proceso puede tomar algunos días hábiles.</p>

      <p>Si tienes alguna duda, comunícate directamente con la oficina de Control Escolar del ITSMT.</p>
    </div>

    <div class="footer">
      Este correo es generado automáticamente por SICE — ITSMT. No responder a este mensaje.
    </div>
  </div>
</body>
</html>

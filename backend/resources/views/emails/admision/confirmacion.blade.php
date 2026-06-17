<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #f0f4f8; padding: 32px 16px; }
    .wrap { max-width: 580px; margin: 0 auto; }

    /* Header */
    .header {
      background: #1a3a5c;
      border-radius: 10px 10px 0 0;
      padding: 30px 36px;
      text-align: center;
    }
    .header .inst { color: #ffffff; font-size: 17px; font-weight: 700; line-height: 1.3; }
    .header .sub  { color: rgba(255,255,255,.60); font-size: 12px; margin-top: 4px; }

    /* Welcome banner */
    .welcome {
      background: #2563eb;
      padding: 20px 36px;
      text-align: center;
    }
    .welcome p { color: #fff; font-size: 14px; line-height: 1.6; }
    .welcome strong { font-size: 16px; display: block; margin-bottom: 4px; }

    /* Body */
    .body { background: #ffffff; padding: 32px 36px; }
    .body p { color: #374151; font-size: 14px; line-height: 1.75; margin-bottom: 16px; }

    /* Card de datos */
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px 24px;
      margin: 20px 0;
    }
    .card-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .8px;
      color: #1a3a5c;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .card table { width: 100%; border-collapse: collapse; }
    .card td { padding: 6px 0; font-size: 13px; color: #374151; vertical-align: top; }
    .card td:first-child {
      font-weight: 600;
      color: #1a3a5c;
      width: 42%;
      padding-right: 12px;
    }

    /* Badge de estatus */
    .badge {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
      border-radius: 20px;
      padding: 3px 12px;
      font-size: 12px;
      font-weight: 600;
    }

    /* Info box */
    .info-box {
      background: #eff6ff;
      border-left: 4px solid #2563eb;
      border-radius: 0 6px 6px 0;
      padding: 14px 18px;
      margin: 20px 0;
    }
    .info-box p { color: #1e40af; font-size: 13px; margin: 0; }

    /* Footer */
    .footer {
      background: #1a3a5c;
      border-radius: 0 0 10px 10px;
      padding: 20px 36px;
      text-align: center;
    }
    .footer p { color: rgba(255,255,255,.55); font-size: 11px; line-height: 1.6; }
  </style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <div class="header">
    <div class="inst">Instituto Tecnológico Superior de Martínez de la Torre</div>
    <div class="sub">Tecnológico Nacional de México · Sistema Integral de Control Escolar</div>
  </div>

  <!-- Bienvenida -->
  <div class="welcome">
    <p>
      <strong>¡Bienvenido(a) al ITSMT, {{ $aspirante->nombres }}!</strong>
      Tu solicitud de admisión ha sido registrada exitosamente.
    </p>
  </div>

  <!-- Cuerpo -->
  <div class="body">

    <p>Estimado(a) <strong>{{ $aspirante->nombres }} {{ $aspirante->apellido_paterno }} {{ $aspirante->apellido_materno }}</strong>,</p>

    <p>
      Nos complace informarte que hemos recibido correctamente tu solicitud de admisión al
      <strong>Instituto Tecnológico Superior de Martínez de la Torre</strong>.
      A continuación encontrarás un resumen de la información que proporcionaste al momento del registro.
    </p>

    <!-- Datos personales -->
    <div class="card">
      <div class="card-title">Datos personales</div>
      <table>
        <tr>
          <td>Nombre completo</td>
          <td>{{ $aspirante->nombres }} {{ $aspirante->apellido_paterno }} {{ $aspirante->apellido_materno }}</td>
        </tr>
        <tr>
          <td>CURP</td>
          <td>{{ $aspirante->curp }}</td>
        </tr>
        <tr>
          <td>Fecha de nacimiento</td>
          <td>{{ \Carbon\Carbon::parse($aspirante->fecha_nacimiento)->translatedFormat('d \de F \de Y') }}</td>
        </tr>
        <tr>
          <td>Correo electrónico</td>
          <td>{{ $aspirante->email }}</td>
        </tr>
        <tr>
          <td>Teléfono</td>
          <td>{{ $aspirante->telefono }}</td>
        </tr>
        @if($aspirante->municipio_procedencia)
        <tr>
          <td>Municipio de procedencia</td>
          <td>{{ $aspirante->municipio_procedencia }}{{ $aspirante->estado_domicilio ? ', ' . $aspirante->estado_domicilio : '' }}</td>
        </tr>
        @endif
      </table>
    </div>

    <!-- Datos de solicitud -->
    <div class="card">
      <div class="card-title">Solicitud de admisión</div>
      <table>
        <tr>
          <td>Carrera solicitada</td>
          <td><strong>{{ $aspirante->carrera->nombre }}</strong></td>
        </tr>
        <tr>
          <td>Periodo</td>
          <td>{{ $aspirante->periodo->nombre }}</td>
        </tr>
        @if($aspirante->promedio_bachillerato)
        <tr>
          <td>Promedio de bachillerato</td>
          <td>{{ number_format($aspirante->promedio_bachillerato, 1) }}</td>
        </tr>
        @endif
        @if($aspirante->modalidad_preferida)
        <tr>
          <td>Modalidad preferida</td>
          <td>{{ ucfirst($aspirante->modalidad_preferida) }}</td>
        </tr>
        @endif
        <tr>
          <td>Estatus de solicitud</td>
          <td><span class="badge">Pendiente de revisión</span></td>
        </tr>
        <tr>
          <td>Fecha de registro</td>
          <td>{{ \Carbon\Carbon::now()->translatedFormat('d \de F \de Y') }}</td>
        </tr>
      </table>
    </div>

    <div class="info-box">
      <p>
        📋 El área de <strong>Control Escolar</strong> revisará tu expediente y te notificará
        el resultado de tu solicitud por este mismo correo. El proceso puede tomar algunos días hábiles.
        Te recomendamos revisar también tu carpeta de spam.
      </p>
    </div>

    <p>Si tienes alguna duda o necesitas más información, puedes comunicarte directamente con la
    oficina de Control Escolar del ITSMT.</p>

    <p>¡Te deseamos mucho éxito en tu proceso de admisión!</p>

    <p style="color: #1a3a5c; font-weight: 600;">Departamento de Servicios Escolares<br>
    Instituto Tecnológico Superior de Martínez de la Torre</p>

  </div>

  <!-- Footer -->
  <div class="footer">
    <p>
      Este mensaje es generado automáticamente por SICE — ITSMT.<br>
      Por favor no respondas a este correo.
    </p>
  </div>

</div>
</body>
</html>

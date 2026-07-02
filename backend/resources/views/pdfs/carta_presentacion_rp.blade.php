<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; margin: 60px 50px; color: #111; line-height: 1.6; }
    h1 { font-size: 13pt; text-align: center; text-transform: uppercase; margin-bottom: 30px; }
    .datos { margin-bottom: 20px; }
    .firma { margin-top: 80px; text-align: center; }
    .linea { border-top: 1px solid #333; width: 260px; margin: 0 auto; }
  </style>
</head>
<body>
  <h1>Carta de Presentación<br>Residencia Profesional</h1>
  <p style="text-align:right">{{ $fecha }}</p>
  <p>
    A quien corresponda.<br>
    <strong>{{ $solicitud->datos_empresa['nombre'] ?? 'Empresa' }}</strong>
    @if(!empty($solicitud->datos_empresa['domicilio']))
      <br>{{ $solicitud->datos_empresa['domicilio'] }}
    @endif
    <br>Presente.
  </p>
  <p>Por medio de la presente, el <strong>{{ $nombreInstitucion }}</strong> se permite presentar al
  alumno(a) <strong>{{ $alumno?->user?->name ?? '—' }}</strong>, con número de control
  <strong>{{ $alumno?->numero_control ?? '—' }}</strong>, quien cursa el último semestre de la carrera
  de <strong>{{ $alumno?->carrera?->nombre ?? '—' }}</strong>.</p>

  <p>El alumno(a) en mención realizará su Residencia Profesional en su empresa en el proyecto relacionado
  con la opción de residencia seleccionada: <strong>{{ ucfirst(str_replace('_', ' ', $solicitud->opcion)) }}</strong>.</p>

  <p>Sin más por el momento, agradecemos de antemano las atenciones y facilidades que se le brinden al
  alumno(a) para el buen desarrollo de su Residencia Profesional.</p>

  <div class="firma">
    <p>&nbsp;</p>
    <div class="linea"></div>
    <p>Director(a) General<br>{{ $nombreInstitucion }}</p>
  </div>
</body>
</html>

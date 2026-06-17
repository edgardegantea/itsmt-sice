<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; text-transform: uppercase; }

    /* Tarjeta credencial: 85.6 × 53.98 mm (tamaño CR-80) escalada a 90% del ancho */
    .credencial {
      width: 320px;
      height: 202px;
      border: 2px solid #1a3a5c;
      border-radius: 10px;
      overflow: hidden;
      margin: 20px auto;
      position: relative;
      background: #fff;
    }

    /* Banda superior institucional */
    .banda-top {
      background: #1a3a5c;
      color: #fff;
      text-align: center;
      padding: 5px 8px 4px;
    }
    .banda-top h1 { font-size: 7pt; font-weight: bold; letter-spacing: 0.3px; }
    .banda-top p  { font-size: 6pt; opacity: .85; }

    /* Cuerpo */
    .cuerpo {
      display: flex;
      padding: 8px;
      gap: 8px;
      height: calc(100% - 42px - 22px);
    }

    /* Foto */
    .foto {
      width: 64px;
      min-width: 64px;
      height: 80px;
      border: 1px solid #aaa;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7pt;
      color: #888;
      text-align: center;
      line-height: 1.3;
      border-radius: 3px;
    }

    /* Datos */
    .datos { flex: 1; }
    .datos .nombre {
      font-size: 8.5pt;
      font-weight: bold;
      color: #1a3a5c;
      line-height: 1.3;
      margin-bottom: 4px;
    }
    .datos .fila {
      font-size: 7pt;
      color: #333;
      margin-bottom: 2px;
    }
    .datos .fila span { font-weight: bold; color: #1a3a5c; }
    .datos .nc {
      font-size: 10pt;
      font-weight: bold;
      color: #1a3a5c;
      letter-spacing: 1px;
      margin-top: 6px;
    }

    /* Banda inferior */
    .banda-bot {
      background: #1a3a5c;
      color: #fff;
      text-align: center;
      font-size: 6.5pt;
      padding: 3px 8px;
      position: absolute;
      bottom: 0;
      width: 100%;
    }

    /* Sección de firma fuera de la tarjeta */
    .firma-area {
      margin: 30px auto;
      max-width: 320px;
      text-align: center;
    }
    .firma-line { border-top: 1px solid #333; margin-top: 40px; }
    .footer { font-size: 7.5pt; color: #777; text-align: center; margin-top: 24px;
              border-top: 1px solid #ddd; padding-top: 6px; }

    /* Nota de impresión */
    .nota {
      max-width: 360px;
      margin: 0 auto 10px;
      font-size: 8pt;
      color: #555;
      text-align: center;
      background: #f0f4f8;
      border: 1px solid #c5d5e5;
      padding: 6px 10px;
      border-radius: 4px;
    }
  </style>
</head>
<body>

<div style="text-align:center; margin: 10px 0 6px;">
  <p style="font-size:8pt; font-weight:bold; color:#1a3a5c;">CREDENCIAL DE ESTUDIANTE</p>
  <p style="font-size:7.5pt; color:#555;">Instituto Tecnológico Superior de Martínez de la Torre</p>
</div>

<div class="nota">
  Imprimir en cartulina tamaño CR-80 (85.6 × 54 mm). Pegar fotografía infantil en el espacio indicado.
</div>

<div class="credencial">
  <div class="banda-top">
    <h1>TECNOLÓGICO NACIONAL DE MÉXICO</h1>
    <p>Instituto Tecnológico Superior de Martínez de la Torre</p>
  </div>

  <div class="cuerpo">
    <div class="foto">FOTO<br>INFANTIL<br>35×45mm</div>

    <div class="datos">
      <div class="nombre">
        {{ $alumno->inscripcion->aspirante->apellido_paterno }}
        {{ $alumno->inscripcion->aspirante->apellido_materno }}<br>
        {{ $alumno->inscripcion->aspirante->nombres }}
      </div>

      <div class="fila"><span>Carrera:</span> {{ $alumno->carrera?->nombre }}</div>
      <div class="fila"><span>Semestre:</span> {{ $alumno->semestre_actual }}° &nbsp;|&nbsp; <span>Periodo:</span> {{ $alumno->periodoIngreso?->nombre }}</div>

      <div class="nc">NC {{ $alumno->numero_control }}</div>
    </div>
  </div>

  <div class="banda-bot">
    Válida para el periodo {{ $alumno->periodoIngreso?->nombre }} · ITSMT
  </div>
</div>

<div class="firma-area">
  <div class="firma-line"></div>
  <p style="margin-top:6px; font-size:9pt;">Director(a) General</p>
  <p style="font-size:8pt; color:#555;">Instituto Tecnológico Superior de Martínez de la Torre</p>
</div>

<div class="footer">
  Documento generado por SICE — ITSMT · {{ now()->format('d/m/Y H:i') }} · NC: {{ $alumno->numero_control }}
</div>

</body>
</html>

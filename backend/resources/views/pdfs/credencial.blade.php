<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 85.6mm;
      height: 54mm;
      background: #fff;
      font-family: Arial, sans-serif;
      text-transform: uppercase;
      overflow: hidden;
    }

    /* ── Frente ── */
    .frente {
      width: 85.6mm;
      height: 54mm;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      page-break-after: always;
    }

    .banda-top {
      background: #1a3a5c;
      color: #fff;
      text-align: center;
      padding: 2.2mm 2mm 1.8mm;
      flex-shrink: 0;
    }
    .banda-top h1 { font-size: 6pt; font-weight: bold; letter-spacing: 0.2px; }
    .banda-top p  { font-size: 5pt; opacity: .85; margin-top: 0.5mm; }

    .cuerpo {
      display: flex;
      flex: 1;
      padding: 2.5mm 3mm;
      gap: 3mm;
      min-height: 0;
    }

    .foto {
      width: 20mm;
      min-width: 20mm;
      border: 0.3mm solid #aaa;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 5pt;
      color: #888;
      text-align: center;
      line-height: 1.4;
      border-radius: 1mm;
      flex-shrink: 0;
    }

    .datos { flex: 1; display: flex; flex-direction: column; justify-content: center; }

    .nombre {
      font-size: 7.5pt;
      font-weight: bold;
      color: #1a3a5c;
      line-height: 1.3;
      margin-bottom: 1.5mm;
    }

    .fila {
      font-size: 5.5pt;
      color: #333;
      margin-bottom: 1mm;
      line-height: 1.3;
    }
    .fila b { color: #1a3a5c; }

    .nc {
      font-size: 8pt;
      font-weight: bold;
      color: #1a3a5c;
      letter-spacing: 0.5px;
      margin-top: 1.5mm;
    }

    .banda-bot {
      background: #1a3a5c;
      color: #fff;
      text-align: center;
      font-size: 5pt;
      padding: 1.5mm 2mm;
      flex-shrink: 0;
      letter-spacing: 0.1px;
    }

    /* ── Reverso ── */
    .reverso {
      width: 85.6mm;
      height: 54mm;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      page-break-before: always;
    }

    .rev-banda-top {
      background: #1a3a5c;
      color: #fff;
      text-align: center;
      padding: 2mm;
      font-size: 5pt;
      flex-shrink: 0;
    }

    .rev-cuerpo {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3mm 4mm 2mm;
      gap: 2mm;
    }

    .rev-nc {
      font-size: 10pt;
      font-weight: bold;
      color: #1a3a5c;
      letter-spacing: 1px;
    }

    .rev-datos {
      font-size: 5.5pt;
      color: #555;
      text-align: center;
      line-height: 1.5;
    }

    .firma-bloque {
      width: 100%;
      text-align: center;
      margin-top: 2mm;
    }
    .firma-linea {
      border-top: 0.3mm solid #333;
      width: 40mm;
      margin: 0 auto 1mm;
    }
    .firma-texto { font-size: 5pt; color: #333; line-height: 1.4; }

    .rev-banda-bot {
      background: #1a3a5c;
      color: #fff;
      text-align: center;
      font-size: 4.5pt;
      padding: 1.5mm 2mm;
      flex-shrink: 0;
      letter-spacing: 0.1px;
    }
  </style>
</head>
<body>

{{-- ── FRENTE ── --}}
<div class="frente">
  <div class="banda-top">
    <h1>TECNOLÓGICO NACIONAL DE MÉXICO</h1>
    <p>Instituto Tecnológico Superior de Martínez de la Torre</p>
  </div>

  <div class="cuerpo">
    <div class="foto">FOTO<br>35×45<br>mm</div>

    <div class="datos">
      <div class="nombre">
        {{ $alumno->inscripcion->aspirante->apellido_paterno }}
        {{ $alumno->inscripcion->aspirante->apellido_materno }}<br>
        {{ $alumno->inscripcion->aspirante->nombres }}
      </div>

      <div class="fila"><b>Carrera:</b> {{ $alumno->carrera?->nombre }}</div>
      <div class="fila">
        <b>Semestre:</b> {{ $alumno->semestre_actual }}° &nbsp;&nbsp;
        <b>Periodo:</b> {{ $alumno->periodoIngreso?->nombre }}
      </div>

      <div class="nc">NC {{ $alumno->numero_control }}</div>
    </div>
  </div>

  <div class="banda-bot">
    Válida para el periodo {{ $alumno->periodoIngreso?->nombre }} · ITSMT
  </div>
</div>

{{-- ── REVERSO ── --}}
<div class="reverso">
  <div class="rev-banda-top">
    CREDENCIAL DE ESTUDIANTE · INSTITUTO TECNOLÓGICO SUPERIOR DE MARTÍNEZ DE LA TORRE
  </div>

  <div class="rev-cuerpo">
    <div class="rev-nc">NC {{ $alumno->numero_control }}</div>

    <div class="rev-datos">
      {{ $alumno->inscripcion->aspirante->apellido_paterno }}
      {{ $alumno->inscripcion->aspirante->apellido_materno }},
      {{ $alumno->inscripcion->aspirante->nombres }}<br>
      {{ $alumno->carrera?->clave }} — {{ $alumno->carrera?->nombre }}<br>
      {{ $alumno->semestre_actual }}° Semestre · {{ $alumno->periodoIngreso?->nombre }}
    </div>

    <div class="firma-bloque">
      <div class="firma-linea"></div>
      <div class="firma-texto">
        DIRECTOR(A) GENERAL<br>
        Instituto Tecnológico Superior de Martínez de la Torre
      </div>
    </div>
  </div>

  <div class="rev-banda-bot">
    Documento generado por SICE · {{ now()->format('d/m/Y') }} · ITSMT
  </div>
</div>

</body>
</html>

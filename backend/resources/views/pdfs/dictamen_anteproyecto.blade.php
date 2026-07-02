@php
  $logoB64  = $cfg->logoBase64();
  $alumno   = $dictamen->solicitudRp?->alumno ?? $dictamen->alumno ?? null;
  $carrera  = $alumno?->carrera ?? null;
  $AZUL     = '#1a3a5c';
  $VERDE    = '#155724';
  $ROJO     = '#721c24';
  $esAceptado = $dictamen->dictamen === 'aceptado';
  $dictamenLabel = $esAceptado ? 'ACEPTADO' : 'RECHAZADO';
  $colorDictamen = $esAceptado ? $VERDE : $ROJO;

  $fecha = $dictamen->fecha_dictamen
    ? \Carbon\Carbon::parse($dictamen->fecha_dictamen)->locale('es')->isoFormat('D [de] MMMM [de] YYYY')
    : now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a1a; padding: 12mm 18mm; }

    .enc { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .enc td { vertical-align: middle; }
    .enc .logo-td { width: 64px; padding-right: 12px; }
    .enc .logo-td img { height: 54px; max-width: 60px; object-fit: contain; }
    .enc .inst { font-size: 10pt; font-weight: bold; color: {{ $AZUL }}; line-height: 1.4; text-transform: uppercase; }
    .enc .dep  { font-size: 8pt; color: #666; margin-top: 3px; }
    .enc .meta { text-align: right; font-size: 8pt; color: #888; white-space: nowrap; vertical-align: top; }

    hr { border: none; border-top: 2px solid {{ $AZUL }}; margin: 6px 0 14px; }

    h1 { font-size: 13pt; font-weight: bold; color: {{ $AZUL }}; text-align: center; text-transform: uppercase; margin-bottom: 4px; }
    .subtitle { font-size: 9pt; text-align: center; color: #555; margin-bottom: 14px; }

    .dictamen-badge {
      display: block;
      margin: 0 auto 16px;
      width: fit-content;
      padding: 6px 20px;
      font-size: 12pt;
      font-weight: bold;
      color: #fff;
      background: {{ $colorDictamen }};
      border-radius: 4px;
      text-align: center;
    }

    table.datos { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    table.datos th, table.datos td { padding: 5px 8px; border: 1px solid #ccc; font-size: 9pt; vertical-align: top; }
    table.datos th { background: #e8edf3; font-weight: bold; color: {{ $AZUL }}; width: 34%; }

    .section-title { font-size: 9.5pt; font-weight: bold; color: {{ $AZUL }}; text-transform: uppercase; margin: 14px 0 6px; border-bottom: 1px solid {{ $AZUL }}; padding-bottom: 2px; }

    .firmas { width: 100%; border-collapse: collapse; margin-top: 40px; }
    .firmas td { text-align: center; vertical-align: bottom; padding: 0 10px; }
    .firmas .linea { border-top: 1px solid #333; padding-top: 4px; font-size: 8pt; color: #333; margin-top: 50px; }
    .firmas .cargo { font-size: 7.5pt; color: #666; }

    .folio { font-size: 8pt; color: #888; }
  </style>
</head>
<body>

{{-- Encabezado institucional --}}
<table class="enc">
  <tr>
    @if($logoB64)
    <td class="logo-td"><img src="data:image/png;base64,{{ $logoB64 }}" alt="Logo"></td>
    @endif
    <td>
      <div class="inst">{{ $cfg->nombre_institucion ?? 'Instituto Tecnológico' }}</div>
      <div class="dep">{{ $cfg->nombre_departamento ?? 'Subdirección Académica' }}</div>
      <div class="dep">División de Estudios Profesionales</div>
    </td>
    <td class="meta">
      <div class="folio">TecNM-AC-PO-004-04</div>
      <div class="folio">Fecha: {{ $fecha }}</div>
    </td>
  </tr>
</table>
<hr>

<h1>Dictamen de Anteproyecto de Residencia Profesional</h1>
<p class="subtitle">Documento oficial — Norma TecNM-AC-PO-004</p>

<div style="text-align:center; margin-bottom: 16px;">
  <span class="dictamen-badge">{{ $dictamenLabel }}</span>
</div>

{{-- Datos del alumno --}}
<div class="section-title">Datos del Alumno</div>
<table class="datos">
  <tr>
    <th>Nombre completo</th>
    <td>{{ $alumno?->user?->name ?? '—' }}</td>
  </tr>
  <tr>
    <th>Número de control</th>
    <td>{{ $alumno?->numero_control ?? '—' }}</td>
  </tr>
  <tr>
    <th>Carrera</th>
    <td>{{ $carrera?->nombre ?? '—' }}</td>
  </tr>
  <tr>
    <th>Número de seguro social</th>
    <td>{{ $dictamen->solicitudRp?->numero_seguro_social ?? '—' }}</td>
  </tr>
  <tr>
    <th>Tipo de seguro</th>
    <td>{{ strtoupper($dictamen->solicitudRp?->tipo_seguro ?? '—') }}</td>
  </tr>
</table>

{{-- Datos del anteproyecto --}}
<div class="section-title">Anteproyecto</div>
<table class="datos">
  <tr>
    <th>Empresa / Organización</th>
    <td>{{ $dictamen->empresa ?? $dictamen->solicitudRp?->datos_empresa['nombre'] ?? '—' }}</td>
  </tr>
  <tr>
    <th>Título del anteproyecto</th>
    <td>{{ $dictamen->anteproyecto ?? '—' }}</td>
  </tr>
  <tr>
    <th>Asesor interno</th>
    <td>{{ $dictamen->asesorInterno?->name ?? '—' }}</td>
  </tr>
  <tr>
    <th>Asesor externo</th>
    <td>{{ $dictamen->asesor_externo ?? '—' }}</td>
  </tr>
  <tr>
    <th>Fecha del dictamen</th>
    <td>{{ $fecha }}</td>
  </tr>
  <tr>
    <th>Dictamen</th>
    <td style="font-weight: bold; color: {{ $colorDictamen }};">{{ $dictamenLabel }}</td>
  </tr>
</table>

{{-- Firmas --}}
<table class="firmas">
  <tr>
    <td>
      <div class="linea">{{ $dictamen->presidenteAcademia?->name ?? 'Presidente de Academia' }}</div>
      <div class="cargo">Presidente de Academia</div>
    </td>
    <td>
      <div class="linea">{{ $dictamen->jefeDepto?->name ?? 'Jefe de Departamento' }}</div>
      <div class="cargo">Jefe de Departamento Académico</div>
    </td>
    <td>
      <div class="linea">{{ $dictamen->subdirectorAcademico?->name ?? 'Subdirector Académico' }}</div>
      <div class="cargo">Subdirector Académico</div>
    </td>
  </tr>
</table>

</body>
</html>

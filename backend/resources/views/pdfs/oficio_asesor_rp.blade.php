@php
  $logoB64  = $cfg->logoBase64();
  $alumno   = $residencia->alumno ?? null;
  $carrera  = $alumno?->carrera ?? null;
  $asesor   = $residencia->asesor ?? null;
  $AZUL     = '#1a3a5c';

  $fecha = now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
  $nc    = $alumno?->numero_control ?? '—';
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a1a; padding: 14mm 18mm; }

    .enc { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .enc td { vertical-align: middle; }
    .enc .logo-td { width: 64px; padding-right: 12px; }
    .enc .logo-td img { height: 54px; max-width: 60px; object-fit: contain; }
    .enc .inst { font-size: 10pt; font-weight: bold; color: {{ $AZUL }}; line-height: 1.4; text-transform: uppercase; }
    .enc .dep  { font-size: 8pt; color: #666; margin-top: 3px; }
    .enc .meta { text-align: right; font-size: 8pt; color: #888; white-space: nowrap; vertical-align: top; }

    hr { border: none; border-top: 2px solid {{ $AZUL }}; margin: 6px 0 14px; }

    .oficio-ref { font-size: 9pt; color: #555; margin-bottom: 12px; text-align: right; }
    h1 { font-size: 12pt; font-weight: bold; color: {{ $AZUL }}; text-align: center; text-transform: uppercase; margin-bottom: 18px; }

    p { font-size: 10pt; line-height: 1.7; margin-bottom: 10px; text-align: justify; }
    strong { color: {{ $AZUL }}; }

    table.datos { width: 100%; border-collapse: collapse; margin: 12px 0; }
    table.datos th, table.datos td { padding: 5px 8px; border: 1px solid #ccc; font-size: 9pt; vertical-align: top; }
    table.datos th { background: #e8edf3; font-weight: bold; color: {{ $AZUL }}; width: 38%; }

    .firma-bloque { margin-top: 60px; text-align: center; }
    .firma-linea { border-top: 1px solid #333; width: 260px; margin: 0 auto 4px; padding-top: 4px; font-size: 9pt; }
    .firma-cargo { font-size: 8pt; color: #555; }

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
    </td>
    <td class="meta">
      <div class="folio">TecNM-AC-PO-004-02</div>
      <div class="folio">{{ $fecha }}</div>
    </td>
  </tr>
</table>
<hr>

<div class="oficio-ref">Oficio No: RP-{{ $nc }}-{{ now()->year }}</div>

<h1>Oficio de Asignación de Asesor Interno<br>Residencia Profesional</h1>

<p>
  Con fundamento en las disposiciones del <strong>Reglamento de Residencias Profesionales del TecNM</strong> y la
  norma <strong>TecNM-AC-PO-004</strong>, se notifica lo siguiente:
</p>

<p>
  El alumno <strong>{{ $alumno?->user?->name ?? '—' }}</strong>, con número de control
  <strong>{{ $nc }}</strong>, de la carrera de <strong>{{ $carrera?->nombre ?? '—' }}</strong>,
  ha sido formalmente asignado al proyecto de Residencia Profesional denominado:
</p>

<table class="datos">
  <tr>
    <th>Empresa / Organización</th>
    <td>{{ $residencia->empresa ?? '—' }}</td>
  </tr>
  <tr>
    <th>Proyecto</th>
    <td>{{ $residencia->proyecto ?? '—' }}</td>
  </tr>
  <tr>
    <th>Asesor interno asignado</th>
    <td>{{ $asesor?->name ?? '—' }}</td>
  </tr>
  <tr>
    <th>Estatus</th>
    <td>{{ ucfirst(str_replace('_', ' ', $residencia->estatus ?? '—')) }}</td>
  </tr>
</table>

<p>
  Se solicita al <strong>{{ $asesor?->name ?? 'Asesor Interno' }}</strong> brindar la orientación técnica
  necesaria al alumno durante el desarrollo del proyecto, conforme a los lineamientos del TecNM
  (mínimo 6 asesorías formales documentadas mediante el formato TecNM-AC-PO-004-07).
</p>

<p>
  El período proyectado de residencia es: <strong>{{ $residencia->solicitudRp?->periodo_proyectado ?? '—' }}</strong>.
</p>

<p>Sin más por el momento, quedo a sus órdenes.</p>

<div class="firma-bloque">
  <div class="firma-linea">Subdirector(a) Académico(a)</div>
  <div class="firma-cargo">{{ $cfg->nombre_institucion ?? 'Instituto Tecnológico' }}</div>
</div>

<p style="margin-top: 40px; font-size: 8pt; color: #888; text-align: center;">
  c.c.p. Archivo / Departamento Académico / Interesado(a)
</p>

</body>
</html>

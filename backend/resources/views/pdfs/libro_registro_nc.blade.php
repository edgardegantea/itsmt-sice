<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  /* ── Reset ── */
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: Arial, sans-serif;
    font-size: 8pt;
    color: #111;
    line-height: 1.3;
    padding: 76px;
  }

  /* ── Encabezado ── */
  .hdr {
    width: 100%;
    border-bottom: 2px solid #1a3a5c;
    padding-bottom: 5px;
    margin-bottom: 6px;
  }
  .hdr table { width: 100%; border-collapse: collapse; }
  .hdr-logo {
    width: 70px;
    font-size: 7pt;
    font-weight: bold;
    color: #1a3a5c;
    text-align: center;
    padding: 3px 2px;
    letter-spacing: 1px;
  }
  .hdr-center { text-align: center; padding: 0 8px; }
  .hdr-center h1 {
    font-size: 9.5pt;
    font-weight: bold;
    color: #1a3a5c;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .hdr-center p { font-size: 7pt; color: #555; margin-top: 1px; }
  .hdr-right {
    text-align: right;
    font-size: 7pt;
    color: #555;
    white-space: nowrap;
    vertical-align: top;
    padding-top: 2px;
  }
  .hdr-right strong { font-size: 8pt; color: #1a3a5c; }

  /* ── Título del documento ── */
  .doc-title {
    font-size: 9pt;
    font-weight: bold;
    color: #fff;
    background: #1a3a5c;
    text-align: center;
    padding: 4px 0;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  /* ── Ficha de metadatos ── */
  .meta {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5pt;
    margin-bottom: 8px;
    border: 1px solid #c5d4e0;
  }
  .meta td { padding: 2px 6px; border: 1px solid #c5d4e0; }
  .meta td.lbl { font-weight: bold; background: #e8f0f7; color: #1a3a5c; width: 14%; white-space: nowrap; }

  /* ── Separador de grupo ── */
  .group-hdr {
    font-size: 7.5pt;
    font-weight: bold;
    color: #1a3a5c;
    background: #dde8f2;
    border-left: 3px solid #1a3a5c;
    padding: 2px 5px;
    margin: 8px 0 3px;
  }

  /* ── Tabla principal ── */
  .tbl {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5pt;
    margin-bottom: 4px;
  }
  .tbl thead tr { background: #1a3a5c; color: #fff; }
  .tbl th {
    padding: 3px 5px;
    text-align: left;
    font-size: 7pt;
    font-weight: bold;
    white-space: nowrap;
    border-right: 1px solid #2d5080;
  }
  .tbl th:last-child { border-right: none; }
  .tbl td {
    padding: 2.5px 5px;
    border-bottom: 1px solid #e4ecf3;
    vertical-align: top;
  }
  .tbl tbody tr:nth-child(even) { background: #f4f7fb; }
  .tbl tbody tr:nth-child(odd)  { background: #ffffff; }
  .mono { font-family: "Courier New", monospace; }

  /* Columnas fijas para aprovechar el ancho */
  .col-num    { width: 3%;  text-align: center; }
  .col-nc     { width: 9%;  }
  .col-curp   { width: 14%; }
  .col-nombre { width: 22%; }
  .col-carrera{ width: 16%; }
  .col-periodo{ width: 13%; }
  .col-fecha  { width: 9%;  white-space: nowrap; }
  .col-sem    { width: 4%;  text-align: center; }
  .col-est    { width: 10%; }

  /* Badges de estatus */
  .badge {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 6.5pt;
    font-weight: bold;
    text-transform: uppercase;
  }
  .badge-activo   { background: #dcfce7; color: #166534; }
  .badge-baja     { background: #fee2e2; color: #991b1b; }
  .badge-graduado { background: #ede9fe; color: #5b21b6; }
  .badge-otro     { background: #f1f5f9; color: #475569; }

  /* ── Pie de página ── */
  .firmas {
    width: 100%;
    border-collapse: collapse;
    margin-top: 18px;
  }
  .firmas td { text-align: center; width: 33%; padding-top: 28px; vertical-align: top; }
  .firma-line { border-top: 1px solid #333; width: 80%; margin: 0 auto 3px; }
  .firma-cargo { font-size: 7.5pt; font-weight: bold; color: #1a3a5c; }
  .firma-inst  { font-size: 6.5pt; color: #666; }

  .nota {
    font-size: 6.5pt;
    color: #777;
    border-top: 1px solid #ddd;
    padding-top: 4px;
    margin-top: 10px;
    text-align: justify;
  }

  .folio-num {
    font-size: 6.5pt;
    color: #999;
    text-align: right;
    margin-top: 2px;
  }
</style>
</head>
<body>

@php
  $cfg = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();
  $logoB64 = $cfg->logoBase64();
@endphp

{{-- ── Encabezado ──────────────────────────────────────────────────────────── --}}
<div class="hdr">
  <table>
    <tr>
      <td class="hdr-logo" style="width:70px; text-align:center; vertical-align:middle;">
        @if($logoB64)
          <img src="{{ $logoB64 }}" alt="{{ $cfg->nombre_corto }}" style="height:48px; max-width:64px; object-fit:contain;">
        @else
          <span style="font-size:8pt; font-weight:bold; color:#1a3a5c; letter-spacing:1px;">{{ $cfg->nombre_corto }}</span>
        @endif
      </td>
      <td class="hdr-center">
        <h1>{{ $cfg->nombre_institucion }}</h1>
        <p>{{ $cfg->subsistema ?? 'Departamento de Servicios Escolares' }}</p>
      </td>
      <td class="hdr-right">
        Generado: <strong>{{ now()->format('d/m/Y H:i') }}</strong><br>
        @if($cfg->clave_tecnm)
          Clave TecNM: <strong>{{ $cfg->clave_tecnm }}</strong>
        @endif
      </td>
    </tr>
  </table>
</div>

{{-- ── Título ───────────────────────────────────────────────────────────────── --}}
<div class="doc-title">LIBRO DE REGISTRO DE NÚMEROS DE CONTROL &nbsp;·&nbsp; TecNM-AC-PO-001</div>

{{-- ── Metadatos ────────────────────────────────────────────────────────────── --}}
<table class="meta">
  <tr>
    <td class="lbl">Fecha emisión</td>
    <td>{{ now()->format('d/m/Y H:i') }}</td>
    <td class="lbl">Total alumnos</td>
    <td><strong>{{ $alumnos->count() }}</strong></td>
    <td class="lbl">Periodos</td>
    <td colspan="3">{{ $alumnos->pluck('periodoIngreso.nombre')->unique()->sort()->implode(' · ') }}</td>
  </tr>
</table>

{{-- ── Tabla por tipo de ingreso ───────────────────────────────────────────── --}}
@foreach($alumnos->groupBy('inscripcion.tipo_ingreso') as $tipoIngreso => $grupo)

<div class="group-hdr">
  {{ mb_strtoupper($tipoIngreso ?: 'SIN CLASIFICAR', 'UTF-8') }} &nbsp;—&nbsp; {{ $grupo->count() }} registro(s)
</div>

<table class="tbl">
  <thead>
    <tr>
      <th class="col-num">#</th>
      <th class="col-nc">N° Control</th>
      <th class="col-curp">CURP</th>
      <th class="col-nombre">Apellidos, Nombre(s)</th>
      <th class="col-carrera">Carrera</th>
      <th class="col-periodo">Periodo ingreso</th>
      <th class="col-fecha">F. Inscripción</th>
      <th class="col-sem">Sem.</th>
      <th class="col-est">Estatus</th>
    </tr>
  </thead>
  <tbody>
    @foreach($grupo->sortBy('numero_control') as $i => $alumno)
    @php
      $estatus = strtolower($alumno->estatus ?? '');
      $badgeClass = match(true) {
        str_contains($estatus, 'activ') => 'badge-activo',
        str_contains($estatus, 'baja')  => 'badge-baja',
        str_contains($estatus, 'gradu') => 'badge-graduado',
        default                         => 'badge-otro',
      };
      $asp = $alumno->inscripcion?->aspirante;
      $ap = mb_strtoupper($asp?->apellido_paterno ?? '', 'UTF-8');
      $am = mb_strtoupper($asp?->apellido_materno ?? '', 'UTF-8');
      $nm = mb_strtoupper($asp?->nombres          ?? '', 'UTF-8');
      $apellidos = $am ? "$ap · $am" : $ap;
      $nombreCompleto = $apellidos . ($nm ? ", $nm" : '');
    @endphp
    <tr>
      <td class="col-num" style="color:#888;">{{ $i + 1 }}</td>
      <td class="col-nc mono" style="font-weight:bold; font-size:7pt;">{{ $alumno->numero_control }}</td>
      <td class="col-curp mono" style="font-size:7pt; letter-spacing:0.3px;">{{ $asp?->curp }}</td>
      <td class="col-nombre">{{ $nombreCompleto }}</td>
      <td class="col-carrera" style="font-size:7pt;">{{ $alumno->carrera?->nombre }}</td>
      <td class="col-periodo" style="font-size:7pt;">{{ $alumno->periodoIngreso?->nombre }}</td>
      <td class="col-fecha" style="font-size:7pt;">{{ $alumno->inscripcion?->fecha_inscripcion?->format('d/m/Y') }}</td>
      <td class="col-sem" style="text-align:center; font-weight:bold;">{{ $alumno->semestre_actual }}</td>
      <td class="col-est"><span class="badge {{ $badgeClass }}">{{ $alumno->estatus }}</span></td>
    </tr>
    @endforeach
  </tbody>
</table>

@endforeach

{{-- ── Nota legal ───────────────────────────────────────────────────────────── --}}
<p class="nota">
  Este documento constituye el registro oficial de números de control expedidos por el Instituto Tecnológico
  Superior de Martínez de la Torre. Es un documento de control interno del Departamento de Servicios Escolares.
  Cualquier modificación posterior deberá documentarse mediante oficio firmado por el Director(a) General y
  el Jefe(a) de Control Escolar, con copia al expediente del alumno. Prohibida su reproducción parcial sin autorización.
</p>

{{-- ── Firmas ───────────────────────────────────────────────────────────────── --}}
<table class="firmas">
  <tr>
    <td>
      <div class="firma-line"></div>
      <div class="firma-cargo">Director(a) General</div>
      <div class="firma-inst">Instituto Tecnológico Superior de Martínez de la Torre</div>
    </td>
    <td>
      <div class="firma-line"></div>
      <div class="firma-cargo">Jefe(a) de Control Escolar</div>
      <div class="firma-inst">Departamento de Servicios Escolares · ITSMT</div>
    </td>
    <td>
      <div class="firma-line"></div>
      <div class="firma-cargo">Subdirector(a) Académico(a)</div>
      <div class="firma-inst">ITSMT</div>
    </td>
  </tr>
</table>

<p class="folio-num">Folio: LIBRO-NC-{{ now()->format('Ymd-His') }}</p>

</body>
</html>

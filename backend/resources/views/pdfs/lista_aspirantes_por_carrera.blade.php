@php
  $cfg        = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();
  $logoB64    = $cfg->logoBase64();
  $porCarrera = $aspirantes->groupBy(fn($a) => $a->carrera->nombre);
  $totalCarreras = $porCarrera->count();
  $fechaInsc  = \Carbon\Carbon::parse($periodo->fecha_inicio)->locale('es')->isoFormat('D [de] MMMM [de] YYYY')
              . ' al '
              . \Carbon\Carbon::parse($periodo->fecha_fin)->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: Arial, sans-serif;
  font-size: 9.5pt;
  color: #111;
  /* margen inferior amplio para que el bloque fijo no tape el contenido */
  padding: 0 0 80px;
  background: #fff;
}

/* ── Encabezado ─────────────────────────────────────────────── */
.hdr-wrap { display: table; width: 100%; border-collapse: collapse; }
.hdr-wrap td { vertical-align: middle; }
.hdr-logo { width: 68px; padding-right: 14px; }
.hdr-logo img { height: 54px; max-width: 64px; object-fit: contain; }
.hdr-logo-txt { font-size: 8.5pt; font-weight: bold; color: #111; letter-spacing: 1px; }
.hdr-center { text-align: center; }
.hdr-center .inst { font-size: 11.5pt; font-weight: bold; color: #111; }
.hdr-center .dep  { font-size: 8pt; color: #555; margin-top: 4px; }
.hdr-meta { text-align: right; font-size: 7pt; color: #777; padding-left: 12px; line-height: 1.8; white-space: nowrap; }
.hdr-meta strong { color: #333; }

.hdr-rule { border: none; border-top: 2px solid #111; margin: 10px 0 16px; }

/* ── Título del documento ────────────────────────────────────── */
.doc-title {
  text-align: center;
  font-size: 12.5pt;
  font-weight: bold;
  color: #111;
  background: #e0e0e0;
  padding: 8px 0 7px;
  letter-spacing: 1px;
  border-top: 2px solid #111;
  border-bottom: 2px solid #111;
  margin-bottom: 16px;
}

/* ── Bloque de datos del documento ──────────────────────────── */
.doc-fields { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
.doc-fields tr td { padding: 5px 0; font-size: 9pt; vertical-align: bottom; }
.doc-fields .lbl {
  font-weight: bold;
  color: #111;
  width: 28%;
  padding-right: 10px;
  white-space: nowrap;
}
.doc-fields .val {
  color: #111;
  padding-bottom: 2px;
}

/* ── Período ─────────────────────────────────────────────────── */
.doc-periodo {
  text-align: right;
  font-size: 7.5pt;
  color: #555;
  margin: 8px 0 14px;
}

/* ── Tabla de aspirantes ─────────────────────────────────────── */
.lista { width: 100%; border-collapse: collapse; font-size: 9pt; }
.lista thead tr th {
  background: #333;
  color: #fff;
  font-weight: bold;
  font-size: 9pt;
  padding: 7px 9px;
}
.lista tbody tr td {
  padding: 6px 9px;
  color: #111;
  font-size: 9pt;
}
.lista tbody tr:nth-child(odd) td  { background: #f4f4f4; }
.lista tbody tr:nth-child(even) td { background: #ffffff; }

.col-no  { text-align: center; width: 6%; color: #555; }
.col-ap  { width: 25%; font-weight: bold; }
.col-am  { width: 22%; }
.col-nm  { width: 26%; }
.col-fch { text-align: center; width: 21%; }

/* Fila total */
.row-total td {
  background: #e8e8e8 !important;
  color: #111 !important;
  font-weight: bold;
  font-size: 9pt;
  padding: 6px 9px;
  border-top: 1.5px solid #555 !important;
}
.row-total .tot-label { text-align: right; }
.row-total .tot-val   { text-align: center; }

/* ── Bloque fijo al pie (firmas + folio) ─────────────────────── */
.page-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
}
.firmas-sep { border: none; border-top: 1px solid #ccc; margin-bottom: 14px; }

.firmas-grid { width: 100%; border-collapse: collapse; }
.firmas-grid td {
  width: 50%;
  text-align: center;
  vertical-align: bottom;
  padding: 0 24px;
}
.firma-space { height: 44px; }
.firma-line  { border-top: 1px solid #333; margin-bottom: 6px; }
.firma-name  { font-size: 9pt; font-weight: bold; color: #111; }
.firma-rol   { font-size: 8pt; color: #555; margin-top: 3px; }
.firma-date  { font-size: 7.5pt; color: #aaa; margin-top: 4px; }

.page-footer { width: 100%; border-collapse: collapse; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 5px; display: table; }
.page-footer td { font-size: 7pt; color: #aaa; vertical-align: middle; }
.pf-left  { text-align: left; }
.pf-right { text-align: right; }

/* ── Saltos de página ────────────────────────────────────────── */
.carrera-block { page-break-after: always; }
.carrera-block:last-child { page-break-after: avoid; }
</style>
</head>
<body>

@foreach($porCarrera as $nombreCarrera => $grupo)
@php $carreraIdx = $loop->iteration; @endphp
<div class="carrera-block">

  {{-- ── Encabezado institucional ─────────────────────────────── --}}
  <table class="hdr-wrap">
    <tr>
      <td class="hdr-logo">
        @if($logoB64)
          <img src="{{ $logoB64 }}" alt="{{ $cfg->nombre_corto }}">
        @else
          <span class="hdr-logo-txt">{{ $cfg->nombre_corto }}</span>
        @endif
      </td>
      <td class="hdr-center">
        <div class="inst">{{ $cfg->nombre_institucion }}</div>
        <div class="dep">{{ $cfg->dependencia ?? 'Tecnológico Nacional de México' }}</div>
      </td>
      <td class="hdr-meta">
        Código: <strong>TecNM-AC-PO-001-01</strong><br>
        Revisión: <strong>O</strong><br>
        @if($cfg->clave_tecnm)Clave: <strong>{{ $cfg->clave_tecnm }}</strong>@endif
      </td>
    </tr>
  </table>
  <hr class="hdr-rule">

  {{-- ── Título ──────────────────────────────────────────────── --}}
  <div class="doc-title">LISTA DE ASPIRANTES ACEPTADOS</div>

  {{-- ── Campos del documento ────────────────────────────────── --}}
  <table class="doc-fields">
    <tr>
      <td class="lbl">INSTITUTO TECNOLÓGICO:</td>
      <td class="val">{{ mb_strtoupper($cfg->nombre_institucion, 'UTF-8') }}</td>
    </tr>
    <tr>
      <td class="lbl">CARRERA:</td>
      <td class="val">{{ mb_strtoupper($nombreCarrera, 'UTF-8') }}</td>
    </tr>
    <tr>
      <td class="lbl">FECHA DE INSCRIPCIÓN:</td>
      <td class="val">{{ mb_strtoupper($fechaInsc, 'UTF-8') }}</td>
    </tr>
  </table>

  <p class="doc-periodo">
    Periodo académico: <strong>{{ mb_strtoupper($periodo->nombre, 'UTF-8') }}</strong>
    &nbsp;&nbsp;|&nbsp;&nbsp;
    Total en esta carrera: <strong>{{ $grupo->count() }}</strong> aspirante(s)
  </p>

  {{-- ── Tabla ───────────────────────────────────────────────── --}}
  <table class="lista">
    <thead>
      <tr>
        <th class="col-no">No.</th>
        <th class="col-ap" style="text-align:left;">Apellido Paterno</th>
        <th class="col-am" style="text-align:left;">Apellido Materno</th>
        <th class="col-nm" style="text-align:left;">Nombre(s)</th>
        <th class="col-fch">No. de Ficha</th>
      </tr>
    </thead>
    <tbody>
      @foreach($grupo->sortBy('apellido_paterno')->values() as $i => $asp)
      <tr>
        <td class="col-no">{{ $i + 1 }}</td>
        <td class="col-ap">{{ mb_strtoupper($asp->apellido_paterno, 'UTF-8') }}</td>
        <td class="col-am">{{ mb_strtoupper($asp->apellido_materno ?? '', 'UTF-8') }}</td>
        <td class="col-nm">{{ mb_strtoupper($asp->nombres, 'UTF-8') }}</td>
        <td class="col-fch">{{ $asp->folio_preinscripcion_tecnm ?? '—' }}</td>
      </tr>
      @endforeach
      <tr class="row-total">
        <td colspan="4" class="tot-label">Total de aspirantes aceptados en la carrera:</td>
        <td class="tot-val">{{ $grupo->count() }}</td>
      </tr>
    </tbody>
  </table>

  {{-- ── Firmas + pie — fijos al fondo, una instancia por carrera ── --}}
  <div class="page-bottom">
    <hr class="firmas-sep">
    <table class="firmas-grid">
      <tr>
        <td>
          <div class="firma-space"></div>
          <div class="firma-line"></div>
          <div class="firma-name">Elaboró</div>
          <div class="firma-rol">Nombre y Firma</div>
          <div class="firma-date">Fecha: _______________</div>
        </td>
        <td>
          <div class="firma-space"></div>
          <div class="firma-line"></div>
          <div class="firma-name">Autorizó</div>
          <div class="firma-rol">Subdirector(a) Académico(a)</div>
          <div class="firma-date">Fecha: _______________</div>
        </td>
      </tr>
    </table>
    <table class="page-footer">
      <tr>
        <td class="pf-left">c.c.p. Departamento de Servicios Escolares.</td>
        <td class="pf-right">
          TecNM-AC-PO-001-01 &nbsp;·&nbsp; Rev. O &nbsp;·&nbsp;
          Lista {{ $carreraIdx }} de {{ $totalCarreras }}
        </td>
      </tr>
    </table>
  </div>

</div>
@endforeach

</body>
</html>

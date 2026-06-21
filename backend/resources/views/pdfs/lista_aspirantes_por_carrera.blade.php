@php
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
  text-transform: uppercase;
  background: #fff;
}

/* ── Un bloque = una o más páginas ──────────────────────────── */
.carrera-block {
  page-break-after: always;
}
.carrera-block:last-child { page-break-after: avoid; }

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

/* ── Título ──────────────────────────────────────────────────── */
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

/* ── Campos ──────────────────────────────────────────────────── */
.doc-fields { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
.doc-fields tr td { padding: 5px 0; font-size: 9pt; vertical-align: bottom; }
.doc-fields .lbl { font-weight: bold; color: #111; width: 28%; padding-right: 10px; white-space: nowrap; }
.doc-fields .val { color: #111; padding-bottom: 2px; }
.doc-periodo { text-align: right; font-size: 7.5pt; color: #555; margin: 8px 0 14px; }

/* ── Tabla ───────────────────────────────────────────────────── */
.lista { width: 100%; border-collapse: collapse; font-size: 9pt; }
.lista thead tr th {
  background: #333; color: #fff; font-weight: bold; font-size: 9pt; padding: 7px 9px;
}
.lista tbody tr td { padding: 6px 9px; color: #111; font-size: 9pt; }
.lista tbody tr:nth-child(odd)  td { background: #f4f4f4; }
.lista tbody tr:nth-child(even) td { background: #ffffff; }
.col-no  { text-align: center; width: 6%; color: #555; }
.col-ap  { width: 25%; font-weight: bold; }
.col-am  { width: 22%; }
.col-nm  { width: 26%; }
.col-fch { text-align: center; width: 21%; }
.row-total td {
  background: #e8e8e8 !important; color: #111 !important;
  font-weight: bold; font-size: 9pt; padding: 6px 9px;
  border-top: 1.5px solid #555 !important;
}
.row-total .tot-label { text-align: right; }
.row-total .tot-val   { text-align: center; }

/* ── Spacer: JS ajusta la altura para empujar firmas al fondo ─ */
.spacer { display: block; }

/* ── Firmas ──────────────────────────────────────────────────── */
.firmas-wrap {
  border-top: 1px solid #ccc;
  padding-top: 14px;
}
.firmas-grid { width: 100%; border-collapse: collapse; }
.firmas-grid td {
  width: 50%; text-align: center; vertical-align: bottom; padding: 0 24px;
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

  {{-- Spacer: altura calculada por JS --}}
  <div class="spacer"></div>

  {{-- ── Firmas al pie de la última página del bloque ──────── --}}
  <div class="firmas-wrap">
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

<script>
(function () {
  // Parámetros del controller: A4 portrait, márgenes 18mm top/bottom
  // Altura útil = 297mm - 18mm - 18mm = 261mm
  // A 96 dpi: 1mm = 96/25.4 px ≈ 3.7795 px
  var MM_TO_PX  = 96 / 25.4;
  var PAGE_H_MM = 261;
  var PAGE_H_PX = PAGE_H_MM * MM_TO_PX; // ≈ 986.6 px

  document.querySelectorAll('.carrera-block').forEach(function (block) {
    var spacer = block.querySelector('.spacer');
    var firmas = block.querySelector('.firmas-wrap');

    // 1. Medir el contenido sin el spacer
    spacer.style.height = '0';
    var contentH  = block.getBoundingClientRect().height;
    var firmasH   = firmas.getBoundingClientRect().height;
    var bodyH     = contentH - firmasH; // contenido antes de las firmas

    // 2. ¿En qué página termina el contenido?
    var pagesNeeded      = Math.ceil(bodyH / PAGE_H_PX) || 1;
    var usedOnLastPage   = bodyH - (pagesNeeded - 1) * PAGE_H_PX;
    var freeOnLastPage   = PAGE_H_PX - usedOnLastPage;

    // 3. ¿Caben las firmas en el espacio libre?
    if (freeOnLastPage >= firmasH + 2) {
      // Caben: ajustar spacer para que queden pegadas al pie
      spacer.style.height = (freeOnLastPage - firmasH) + 'px';
    } else {
      // No caben: empujar las firmas a la página siguiente
      spacer.style.height = freeOnLastPage + 'px';
    }
  });
})();
</script>

</body>
</html>

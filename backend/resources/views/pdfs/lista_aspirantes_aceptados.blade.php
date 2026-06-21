@php
  $logoB64      = $cfg->logoBase64();
  $porCarrera   = $aspirantes->groupBy(fn($a) => $a->carrera->nombre);
  $totalPaginas = $porCarrera->count();
  $paginaActual = 0;
  $FILAS_MIN    = 15;
  $AZUL         = '#1a3a5c';
  $AZUL_CLARO   = '#e8eef5';
  $LINEA        = '#c8d4e0';
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 9pt;
      color: #1a1a1a;
      background: #fff;
      text-transform: uppercase;
    }

    .pagina { padding: 0; page-break-after: always; }
    .pagina:last-child { page-break-after: avoid; }

    /* ── Encabezado institucional ── */
    .enc {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    .enc td { vertical-align: middle; }
    .enc .logo-td { width: 62px; padding-right: 10px; }
    .enc .logo-td img { height: 52px; max-width: 58px; object-fit: contain; }
    .enc .nombre-td .inst {
      font-size: 11pt;
      font-weight: bold;
      color: {{ $AZUL }};
      line-height: 1.2;
    }
    .enc .nombre-td .dep {
      font-size: 7.5pt;
      color: #666;
      margin-top: 2px;
    }
    .enc .meta-td {
      text-align: right;
      font-size: 7pt;
      color: #888;
      white-space: nowrap;
      padding-left: 8px;
      vertical-align: top;
    }

    /* Línea separadora institucional */
    .sep-top {
      height: 3px;
      background: {{ $AZUL }};
      margin: 10px 0 6px 0;
    }
    .sep-ref {
      font-size: 7pt;
      color: #aaa;
      text-align: right;
      margin-bottom: 20px;
    }

    /* ── Título ── */
    .titulo {
      text-align: center;
      margin-bottom: 20px;
    }
    .titulo h1 {
      font-size: 13.5pt;
      font-weight: bold;
      color: {{ $AZUL }};
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }
    .titulo .proceso {
      font-size: 8pt;
      color: #888;
      margin-top: 3px;
      letter-spacing: 0.3px;
    }

    /* ── Ficha de encabezado ── */
    .ficha {
      margin-bottom: 16px;
    }
    .ficha-fila {
      margin-bottom: 4px;
      font-size: 8.5pt;
      line-height: 1.4;
    }
    .ficha-fila .lbl {
      font-weight: bold;
      color: {{ $AZUL }};
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.5px;
    }
    .ficha-fila .val {
      color: #111;
      font-size: 8.5pt;
    }

    /* ── Tabla de aspirantes ── */
    .tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-bottom: 26px;
    }
    /* Encabezado */
    .tbl thead tr {
      background: {{ $AZUL }};
      color: #fff;
    }
    .tbl th {
      padding: 7px 8px;
      font-size: 7.5pt;
      font-weight: bold;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }
    .tbl th.c { text-align: center; }
    /* Cuerpo */
    .tbl td {
      padding: 5px 8px;
      border-bottom: 1px solid {{ $LINEA }};
      vertical-align: middle;
    }
    .tbl td.c { text-align: center; }
    .tbl tbody tr:nth-child(even) { background: {{ $AZUL_CLARO }}; }
    /* Sin bordes laterales — solo líneas horizontales */
    .tbl, .tbl th, .tbl td { border-left: none; border-right: none; }
    /* Borde superior e inferior de la tabla */
    .tbl thead tr th:first-child { border-radius: 4px 0 0 0; }
    .tbl thead tr th:last-child  { border-radius: 0 4px 0 0; }

    .col-no    { width: 6%; }
    .col-ap    { width: 22%; }
    .col-am    { width: 22%; }
    .col-nom   { width: 32%; }
    .col-ficha { width: 18%; }

    .fila-vacia td { border-bottom: 1px solid #e8eef5; color: transparent; }
    .num-fila { color: #bbb; font-size: 8pt; }

    /* ── Firmas ── */
    .firmas-wrap {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .firmas-wrap td { vertical-align: bottom; }
    .firma-bloque { padding: 0 28px; text-align: center; }
    .firma-nombre-pre {
      font-size: 8pt;
      color: #444;
      min-height: 16px;
      margin-bottom: 2px;
    }
    .firma-linea {
      border-top: 1.5px solid #333;
      margin-bottom: 5px;
    }
    .firma-rol {
      font-size: 8.5pt;
      font-weight: bold;
      color: {{ $AZUL }};
    }
    .firma-cargo {
      font-size: 7.5pt;
      color: #666;
      margin-top: 2px;
    }
    .firma-fecha {
      font-size: 7.5pt;
      color: #888;
      margin-top: 5px;
    }

    /* ── Pie ── */
    .pie {
      width: 100%;
      border-top: 1px solid {{ $LINEA }};
      padding-top: 6px;
      border-collapse: collapse;
    }
    .pie td { font-size: 7pt; vertical-align: middle; }
    .pie .ccp { color: #666; }
    .pie .ref  { color: #bbb; text-align: right; }
  </style>
</head>
<body>

@foreach($porCarrera as $nombreCarrera => $grupo)
@php
  $paginaActual++;
  $lista       = $grupo->sortByDesc('apellido_paterno')->values();
  $total       = $lista->count();
  $filasVacias = max(0, $FILAS_MIN - $total);
@endphp

<div class="pagina">

  {{-- ── Encabezado institucional ── --}}
  <table class="enc">
    <tr>
      @if($logoB64)
      <td class="logo-td">
        <img src="{{ $logoB64 }}" alt="{{ $cfg->nombre_corto }}">
      </td>
      @endif
      <td class="nombre-td">
        <div class="inst">{{ mb_strtoupper($cfg->nombre_institucion, 'UTF-8') }}</div>
        @if($cfg->dependencia)
          <div class="dep">{{ $cfg->dependencia }}</div>
        @endif
        @if($cfg->subsistema)
          <div class="dep">{{ $cfg->subsistema }}</div>
        @endif
      </td>
      <td class="meta-td">
        @if($cfg->clave_tecnm)<strong style="color:#555;">{{ $cfg->clave_tecnm }}</strong><br>@endif
        @if($cfg->ciudad){{ $cfg->ciudad }}{{ $cfg->estado ? ', '.$cfg->estado : '' }}<br>@endif
        {{ now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY') }}
      </td>
    </tr>
  </table>

  <div class="sep-top"></div>
  <div class="sep-ref">TecNM-AC-PO-001-01 · Rev. O</div>

  {{-- ── Título ── --}}
  <div class="titulo">
    <h1>Lista de Aspirantes Aceptados</h1>
    <div class="proceso">Proceso de Admisión · Período {{ $periodo->nombre ?? '' }}</div>
  </div>

  {{-- ── Ficha ── --}}
  <div class="ficha">
    <div class="ficha-fila">
      <span class="lbl">Instituto Tecnológico: </span><span class="val">{{ mb_strtoupper($cfg->nombre_institucion, 'UTF-8') }}</span>
    </div>
    <div class="ficha-fila">
      <span class="lbl">Carrera: </span><span class="val">{{ mb_strtoupper($nombreCarrera, 'UTF-8') }}</span>
    </div>
    <div class="ficha-fila">
      <span class="lbl">Fecha de Inscripción: </span><span class="val">{{ \Carbon\Carbon::parse($periodo->fecha_inicio)->locale('es')->isoFormat('D [de] MMMM [de] YYYY') }}</span>
    </div>
  </div>

  {{-- ── Tabla de aspirantes ── --}}
  <table class="tbl">
    <thead>
      <tr>
        <th class="col-no  c">No.</th>
        <th class="col-ap">Apellido Paterno</th>
        <th class="col-am">Apellido Materno</th>
        <th class="col-nom">Nombre(s)</th>
        <th class="col-ficha c">No. de Ficha</th>
      </tr>
    </thead>
    <tbody>
      @foreach($lista as $i => $asp)
      <tr>
        <td class="c num-fila">{{ $i + 1 }}</td>
        <td style="font-weight:600;">{{ mb_strtoupper($asp->apellido_paterno, 'UTF-8') }}</td>
        <td>{{ mb_strtoupper($asp->apellido_materno ?? '', 'UTF-8') }}</td>
        <td>{{ mb_strtoupper($asp->nombres, 'UTF-8') }}</td>
        <td class="c" style="font-family:monospace; font-size:8pt; color:#444; letter-spacing:0.5px;">
          {{ $asp->numero_ficha ?? $asp->folio_preinscripcion_tecnm ?? '—' }}
        </td>
      </tr>
      @endforeach
      @for($f = 0; $f < $filasVacias; $f++)
      <tr class="fila-vacia" style="height:21px;">
        <td class="c">{{ $total + $f + 1 }}</td>
        <td>&nbsp;</td><td></td><td></td><td></td>
      </tr>
      @endfor
    </tbody>
  </table>

  {{-- ── Firmas ── --}}
  <table class="firmas-wrap">
    <tr>
      <td style="width:50%;">
        <div class="firma-bloque">
          <div class="firma-nombre-pre">
            {{ mb_strtoupper($jefeControlEscolar?->name ?? '', 'UTF-8') }}
          </div>
          <div class="firma-linea"></div>
          <div class="firma-rol">Elaboró</div>
          <div class="firma-cargo">{{ $jefeControlEscolar?->cargo ?? 'Responsable de Servicios Escolares' }}</div>
          <div class="firma-fecha">
            Fecha: {{ now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY') }}
          </div>
        </div>
      </td>
      <td style="width:50%;">
        <div class="firma-bloque">
          <div class="firma-nombre-pre">
            {{ mb_strtoupper($subdirectorAcademico?->name ?? '', 'UTF-8') }}
          </div>
          <div class="firma-linea"></div>
          <div class="firma-rol">Autorizó</div>
          <div class="firma-cargo">{{ $subdirectorAcademico?->cargo ?? 'Subdirector(a) Académico(a)' }}</div>
          <div class="firma-fecha">Fecha: ________________________________</div>
        </div>
      </td>
    </tr>
  </table>

  {{-- ── Pie ── --}}
  <table class="pie">
    <tr>
      <td class="ccp">c.c.p. Departamento de Servicios Escolares.</td>
      <td class="ref">Pág. {{ $paginaActual }} de {{ $totalPaginas }}</td>
    </tr>
  </table>

</div>
@endforeach

</body>
</html>

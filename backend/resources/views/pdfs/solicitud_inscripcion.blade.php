@php
  $cfg  = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();
  $logoB64 = $cfg->logoBase64();
  $asp  = $inscripcion->aspirante;
  $carr = $inscripcion->carrera;
  $per  = $inscripcion->periodo;
  $AZUL = '#1a3a5c';
  $LINEA = '#c8d4e0';
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 7.5pt; color: #111; background: #fff; text-transform: uppercase; }

    .pag { padding: 0; }

    /* ── Encabezado institucional ── */
    .enc { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    .enc td { vertical-align: middle; }
    .enc .logo-td { width: 60px; padding-right: 10px; }
    .enc .logo-td img { height: 50px; max-width: 56px; object-fit: contain; }
    .enc .inst { font-size: 9pt; font-weight: bold; color: {{ $AZUL }}; line-height: 1.2; }
    .enc .dep  { font-size: 7pt; color: #666; margin-top: 2px; }
    .enc .meta { text-align: right; font-size: 7pt; color: #888; white-space: nowrap; vertical-align: top; }

    .sep { height: 3px; background: {{ $AZUL }}; margin: 5px 0 3px; }
    .ref { font-size: 6.5pt; color: #aaa; text-align: right; margin-bottom: 8px; }

    /* ── Bloque encabezado del formato ── */
    .fmt-header { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 8px; }
    .fmt-header td { padding: 2px 0; vertical-align: bottom; }
    .fmt-header .lbl { font-weight: bold; color: {{ $AZUL }}; white-space: nowrap; padding-right: 5px; }
    .fmt-header .val { border-bottom: 1.2px solid #333; padding: 0 4px 1px; }

    /* ── Título ── */
    .titulo {
      text-align: center;
      font-size: 10pt;
      font-weight: bold;
      color: {{ $AZUL }};
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    /* ── Sección: etiqueta + línea ── */
    .sec-title {
      font-size: 7pt;
      font-weight: bold;
      color: {{ $AZUL }};
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-bottom: 1.5px solid {{ $AZUL }};
      padding-bottom: 1px;
      margin-bottom: 4px;
      margin-top: 7px;
    }

    /* ── Campos: etiqueta + valor subrayado ── */
    .campos { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 2px; }
    .campos td { padding: 2px 3px; vertical-align: bottom; }
    .campos .lbl { font-weight: bold; color: {{ $AZUL }}; white-space: nowrap; }
    .campos .val { border-bottom: 1px solid #444; padding: 0 4px 1px; }
    .campos .hint { font-size: 7pt; color: #999; }

    /* ── Tabla de documentos ── */
    .docs-wrap {
      border: 1.5px solid {{ $AZUL }};
      padding: 5px 8px;
      margin-top: 7px;
      margin-bottom: 5px;
    }
    .docs-title {
      font-size: 7pt;
      font-weight: bold;
      color: {{ $AZUL }};
      margin-bottom: 3px;
    }
    .docs-sub { font-size: 6.5pt; color: #555; margin-bottom: 3px; }

    .tbl-docs { width: 100%; border-collapse: collapse; font-size: 7pt; }
    .tbl-docs th {
      background: {{ $AZUL }};
      color: #fff;
      padding: 3px 6px;
      font-size: 6.5pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .tbl-docs th.c, .tbl-docs td.c { text-align: center; }
    .tbl-docs td {
      padding: 3px 6px;
      border-bottom: 1px solid {{ $LINEA }};
      vertical-align: middle;
    }
    .tbl-docs tbody tr:nth-child(even) { background: #f4f7fb; }
    .tbl-docs td.check { font-size: 11pt; color: #2d6a2d; text-align: center; }
    .tbl-docs td.pending { color: #aaa; text-align: center; }
    .nota { font-size: 7pt; color: #777; margin-top: 5px; }

    /* ── Compromiso ── */
    .compromiso {
      font-size: 6.5pt;
      color: #444;
      margin-top: 4px;
      padding: 4px 7px;
      background: #f8fafc;
      border-left: 3px solid {{ $LINEA }};
    }

    /* ── Firmas ── */
    .firmas { width: 100%; border-collapse: collapse; margin-top: 14px; }
    .firmas td { text-align: center; vertical-align: bottom; padding: 0 20px; }
    .firma-espacio { height: 28px; }
    .firma-linea { border-top: 1.2px solid #333; margin-bottom: 3px; }
    .firma-nombre { font-size: 7pt; color: #333; font-weight: bold; }
    .firma-cargo  { font-size: 6.5pt; color: #777; margin-top: 1px; }

    /* ── Pie ── */
    .pie {
      width: 100%; border-top: 1px solid {{ $LINEA }};
      padding-top: 4px; margin-top: 10px;
      border-collapse: collapse;
    }
    .pie td { font-size: 7pt; color: #aaa; }
    .pie .right { text-align: right; }
  </style>
</head>
<body>
<div class="pag">

  {{-- ── Encabezado institucional ── --}}
  <table class="enc">
    <tr>
      @if($logoB64)
      <td class="logo-td"><img src="{{ $logoB64 }}" alt="{{ $cfg->nombre_corto }}"></td>
      @endif
      <td>
        <div class="inst">{{ mb_strtoupper($cfg->nombre_institucion, 'UTF-8') }}</div>
        @if($cfg->dependencia)<div class="dep">{{ $cfg->dependencia }}</div>@endif
        @if($cfg->subsistema)<div class="dep">{{ $cfg->subsistema }}</div>@endif
      </td>
      <td class="meta">
        @if($cfg->clave_tecnm)<strong style="color:#555;">{{ $cfg->clave_tecnm }}</strong><br>@endif
        N° Control: <strong style="color:#333;">{{ $inscripcion->numero_control }}</strong>
      </td>
    </tr>
  </table>
  <div class="sep"></div>
  <div class="ref">TecNM-AC-PO-001-02 · Rev. O · Solicitud de Inscripción</div>

  {{-- ── Encabezado del formato (Instituto / Periodo / Fecha) ── --}}
  <table class="fmt-header">
    <tr>
      <td class="lbl" style="width:32%;">INSTITUTO TECNOLÓGICO:</td>
      <td class="val" style="width:38%;">{{ mb_strtoupper($cfg->nombre_institucion, 'UTF-8') }}</td>
      <td style="width:3%;"></td>
      <td class="lbl" style="width:10%; white-space:nowrap;">PERIODO:</td>
      <td class="val" style="width:17%;">{{ $per->nombre }}</td>
    </tr>
    <tr><td colspan="5" style="height:4px;"></td></tr>
    <tr>
      <td class="lbl">FECHA:</td>
      <td class="val" colspan="4">
        {{ now()->format('d') }} de {{ now()->locale('es')->isoFormat('MMMM') }} de {{ now()->format('Y') }}
      </td>
    </tr>
  </table>

  {{-- ── Título ── --}}
  <div class="titulo">Solicitud de Inscripción</div>

  {{-- ── Nombre ── --}}
  <table class="campos">
    <tr>
      <td class="lbl" style="width:14%;">NOMBRE:</td>
      <td class="val">
        {{ mb_strtoupper($asp->apellido_paterno, 'UTF-8') }}
        {{ mb_strtoupper($asp->apellido_materno ?? '', 'UTF-8') }},
        {{ mb_strtoupper($asp->nombres, 'UTF-8') }}
      </td>
      <td class="hint" style="padding-left:8px; white-space:nowrap;">(Apellido paterno, apellido materno, nombre(s))</td>
    </tr>
  </table>

  {{-- ── Nacimiento / Estado civil ── --}}
  <table class="campos" style="margin-top:4px;">
    <tr>
      <td class="lbl" style="width:28%;">FECHA DE NACIMIENTO:</td>
      <td class="val" style="width:22%;">
        {{ \Carbon\Carbon::parse($asp->fecha_nacimiento)->locale('es')->isoFormat('D [de] MMMM [de] YYYY') }}
      </td>
      <td style="width:4%;"></td>
      <td class="lbl" style="width:18%;">ESTADO CIVIL:</td>
      <td class="val">{{ ucfirst(str_replace('_', ' ', $asp->estado_civil ?? '—')) }}</td>
    </tr>
  </table>

  {{-- ── Dirección ── --}}
  <div class="sec-title" style="margin-top:8px;">Dirección</div>
  <table class="campos">
    <tr>
      <td class="lbl" style="width:10%;">CALLE:</td>
      <td class="val" style="width:40%;">{{ mb_strtoupper($asp->calle ?? '', 'UTF-8') }}</td>
      <td style="width:4%;"></td>
      <td class="lbl" style="width:12%;">COLONIA:</td>
      <td class="val">{{ mb_strtoupper($asp->colonia ?? '', 'UTF-8') }}</td>
    </tr>
  </table>
  <table class="campos" style="margin-top:4px;">
    <tr>
      <td class="lbl" style="width:10%;">CIUDAD:</td>
      <td class="val" style="width:36%;">{{ mb_strtoupper($asp->ciudad ?? '', 'UTF-8') }}</td>
      <td style="width:4%;"></td>
      <td class="lbl" style="width:10%;">ESTADO:</td>
      <td class="val" style="width:20%;">{{ mb_strtoupper($asp->estado_domicilio ?? '', 'UTF-8') }}</td>
      <td style="width:3%;"></td>
      <td class="lbl" style="width:12%; white-space:nowrap;">C.P.:</td>
      <td class="val" style="width:5%;">{{ $asp->codigo_postal ?? '' }}</td>
    </tr>
  </table>
  <table class="campos" style="margin-top:4px;">
    <tr>
      <td class="lbl" style="width:14%;">TELÉFONO:</td>
      <td class="val" style="width:30%;">{{ $asp->telefono ?? '—' }}</td>
      <td style="width:4%;"></td>
      <td class="lbl" style="width:10%;">E-MAIL:</td>
      <td class="val">{{ $asp->email }}</td>
    </tr>
  </table>

  {{-- ── Carrera ── --}}
  <div class="sec-title">Carrera</div>
  <table class="campos">
    <tr>
      <td class="lbl" style="width:28%;">CARRERA A CURSAR:</td>
      <td class="val" style="font-weight:bold;">{{ mb_strtoupper($carr->nombre, 'UTF-8') }}</td>
    </tr>
  </table>

  {{-- ── Escuela de procedencia ── --}}
  <div class="sec-title">Escuela de Procedencia</div>
  <table class="campos">
    <tr>
      <td class="lbl" style="width:30%;">NOMBRE DE LA ESCUELA:</td>
      <td class="val" style="width:42%;">{{ mb_strtoupper($asp->escuela_bachillerato, 'UTF-8') }}</td>
      <td style="width:4%;"></td>
      <td class="lbl" style="width:12%;">PROMEDIO:</td>
      <td class="val" style="width:12%; text-align:center;">{{ number_format($asp->promedio_bachillerato, 1) }}</td>
    </tr>
  </table>

  {{-- ── Documentos ── --}}
  <div class="docs-wrap">
    <div class="docs-title">PARA USO EXCLUSIVO DEL DEPARTAMENTO DE SERVICIOS ESCOLARES</div>
    <div class="docs-sub">Original para cotejar y copias</div>

    <table class="tbl-docs">
      <thead>
        <tr>
          <th style="width:5%; text-align:center;">#</th>
          <th style="text-align:left;">Documentos Solicitados (TecNM-AC-PO-001-A01)</th>
          <th style="width:22%; text-align:center;">Entregado</th>
        </tr>
      </thead>
      <tbody>
        @foreach($documentos as $i => $doc)
        <tr>
          <td class="c" style="color:#555; font-size:8pt;">{{ $i + 1 }}</td>
          <td>{{ $doc['nombre'] }}</td>
          @if($doc['entregado'])
          <td class="check">✓</td>
          @else
          <td class="pending">( &nbsp; )</td>
          @endif
        </tr>
        @endforeach
      </tbody>
    </table>

    <p class="nota">
      El checklist refleja el estado actual de documentos registrados en el expediente digital.
    </p>

    <div style="text-align:right; margin-top:6px; font-size:8pt; color:{{ $AZUL }};">
      Recibió y revisó: ________________________________
    </div>
  </div>

  <div class="compromiso">
    En caso de no tener todos los documentos solicitados, me comprometo a entregarlos antes del proceso de reinscripción.
  </div>

  {{-- ── Firmas ── --}}
  <table class="firmas">
    <tr>
      <td style="width:50%;">
        <div class="firma-espacio"></div>
        <div class="firma-linea"></div>
        <div class="firma-nombre">
          {{ mb_strtoupper($asp->apellido_paterno, 'UTF-8') }}
          {{ mb_strtoupper($asp->apellido_materno ?? '', 'UTF-8') }},
          {{ mb_strtoupper($asp->nombres, 'UTF-8') }}
        </div>
        <div class="firma-cargo">Nombre y Firma del Aspirante</div>
      </td>
      <td style="width:50%;">
        <div class="firma-espacio"></div>
        <div class="firma-linea"></div>
        <div class="firma-nombre">
          {{ $cfg->responsable_servicios_escolares
              ? mb_strtoupper($cfg->responsable_servicios_escolares, 'UTF-8')
              : 'SELLO Y FIRMA' }}
        </div>
        <div class="firma-cargo">Departamento de Servicios Escolares</div>
      </td>
    </tr>
  </table>

  {{-- ── Pie ── --}}
  <table class="pie">
    <tr>
      <td>TecNM-AC-PO-001-02 · Rev. O</td>
      <td class="right">N° Control: {{ $inscripcion->numero_control }}</td>
    </tr>
  </table>

</div>
</body>
</html>

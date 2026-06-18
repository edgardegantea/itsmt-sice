@php
  $cfg  = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();
  $logoB64 = $cfg->logoBase64();
  $asp  = $inscripcion->aspirante;
  $carr = $inscripcion->carrera;
  $per  = $inscripcion->periodo;
  $jefeControlEscolar = \App\Models\User::where('email', 'servescolares@martineztorre.tecnm.mx')->first()
                        ?? \App\Models\User::role('personal_administrativo')->orderBy('created_at')->first();
  $AZUL  = '#1a3a5c';
  $LINEA = '#c8d4e0';
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 7.5pt; color: #111; background: #fff; text-transform: uppercase; }

    /* ── Encabezado institucional ── */
    .enc { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    .enc td { vertical-align: middle; }
    .enc .logo-td { width: 60px; padding-right: 10px; }
    .enc .logo-td img { height: 50px; max-width: 56px; object-fit: contain; }
    .enc .inst { font-size: 9.5pt; font-weight: bold; color: {{ $AZUL }}; line-height: 1.2; }
    .enc .meta { text-align: right; font-size: 7pt; color: #888; white-space: nowrap; vertical-align: top; }

    .ref { font-size: 6.5pt; color: #aaa; text-align: right; margin-bottom: 8px; border-top: 1px solid {{ $LINEA }}; padding-top: 3px; }

    /* ── Bloque encabezado del formato ── */
    .fmt-row { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 3px; }
    .fmt-row td { padding: 2px 4px; vertical-align: middle; }
    .lbl { font-weight: bold; color: {{ $AZUL }}; white-space: nowrap; }
    .val { font-weight: bold; color: #222; }

    /* ── Título ── */
    .titulo {
      text-align: center;
      font-size: 10pt;
      font-weight: bold;
      color: {{ $AZUL }};
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 6px 0 8px;
    }

    /* ── Sección ── */
    .sec-title {
      font-size: 7pt;
      font-weight: bold;
      color: #fff;
      background: {{ $AZUL }};
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 2px 6px;
      margin-bottom: 4px;
      margin-top: 7px;
    }

    /* ── Filas de datos: etiqueta + valor juntos en cada celda ── */
    .fila { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 3px; }
    .fila td { padding: 2px 4px; vertical-align: middle; }
    .fila .campo { white-space: nowrap; }
    .hint { font-size: 6.5pt; color: #999; font-weight: normal; }

    /* ── Tabla de documentos ── */
    .docs-wrap {
      border: 1.5px solid {{ $AZUL }};
      padding: 5px 8px;
      margin-top: 7px;
      margin-bottom: 5px;
    }
    .docs-title { font-size: 7pt; font-weight: bold; color: {{ $AZUL }}; margin-bottom: 3px; }
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

    /* ── Firmas (sin línea) ── */
    .firmas { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .firmas td { text-align: center; vertical-align: bottom; padding: 0 20px; }
    .firma-espacio { height: 32px; }
    .firma-nombre { font-size: 7.5pt; color: #111; font-weight: bold; border-top: 1px solid #333; padding-top: 4px; }
    .firma-cargo  { font-size: 6.5pt; color: #777; margin-top: 2px; }

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

  {{-- ── Encabezado institucional ── --}}
  <table class="enc">
    <tr>
      @if($logoB64)
      <td class="logo-td"><img src="{{ $logoB64 }}" alt="{{ $cfg->nombre_corto }}"></td>
      @endif
      <td>
        <div class="inst">{{ mb_strtoupper($cfg->nombre_institucion, 'UTF-8') }}</div>
      </td>
      <td class="meta">
        @if($cfg->clave_tecnm)<strong style="color:#555;">{{ $cfg->clave_tecnm }}</strong><br>@endif
        N° Control: <strong style="color:#333;">{{ $inscripcion->numero_control }}</strong>
      </td>
    </tr>
  </table>
  <div class="ref">TecNM-AC-PO-001-02 · Rev. O · Solicitud de Inscripción</div>

  {{-- ── Encabezado del formato ── --}}
  <table class="fila" style="margin-bottom:6px;">
    <tr>
      <td style="width:60%;" class="campo">
        <span class="lbl">INSTITUTO TECNOLÓGICO:</span>
        <span class="val">{{ mb_strtoupper($cfg->nombre_institucion, 'UTF-8') }}</span>
      </td>
      
    </tr>
    <tr>
      <td class="campo">
        <span class="lbl">PERIODO:</span>
        <span class="val">{{ $per->nombre }}</span>
      </td>
      <td colspan="2" class="campo">
        <span class="lbl">FECHA:</span>
        <span class="val">{{ now()->format('d') }} de {{ now()->locale('es')->isoFormat('MMMM') }} de {{ now()->format('Y') }}</span>
      </td>
    </tr>
  </table>

  <br>

  {{-- ── Título ── --}}
  <div class="titulo">Solicitud de Inscripción</div>
  <br>

  {{-- ── Nombre ── --}}
  <table class="fila">
    <tr>
      <td class="campo">
        <span class="lbl">NOMBRE:</span>
        <span class="val">
          {{ mb_strtoupper($asp->apellido_paterno, 'UTF-8') }}
          {{ mb_strtoupper($asp->apellido_materno ?? '', 'UTF-8') }},
          {{ mb_strtoupper($asp->nombres, 'UTF-8') }}
        </span>
        <span class="hint">&nbsp;(Apellido paterno, apellido materno, nombre(s))</span>
      </td>
    </tr>
  </table>

  {{-- ── Nacimiento / Estado civil ── --}}
  <table class="fila">
    <tr>
      <td style="width:50%;" class="campo">
        <span class="lbl">FECHA DE NACIMIENTO:</span>
        <span class="val">{{ \Carbon\Carbon::parse($asp->fecha_nacimiento)->locale('es')->isoFormat('D [de] MMMM [de] YYYY') }}</span>
      </td>
      <td class="campo">
        <span class="lbl">ESTADO CIVIL:</span>
        <span class="val">{{ ucfirst(str_replace('_', ' ', $asp->estado_civil ?? '—')) }}</span>
      </td>
    </tr>
  </table>

  {{-- ── Dirección ── --}}
  <div class="sec-title">Dirección</div>
  <table class="fila">
    <tr>
      <td style="width:50%;" class="campo">
        <span class="lbl">CALLE:</span>
        <span class="val">{{ mb_strtoupper($asp->calle ?? '', 'UTF-8') }}</span>
      </td>
      <td class="campo">
        <span class="lbl">COLONIA:</span>
        <span class="val">{{ mb_strtoupper($asp->colonia ?? '', 'UTF-8') }}</span>
      </td>
    </tr>
    <tr>
      <td class="campo">
        <span class="lbl">CIUDAD:</span>
        <span class="val">{{ mb_strtoupper($asp->ciudad ?? '', 'UTF-8') }}</span>
      </td>
      <td class="campo">
        <span class="lbl">ESTADO:</span>
        <span class="val">{{ mb_strtoupper($asp->estado_domicilio ?? '', 'UTF-8') }}</span>
        &nbsp;&nbsp;
        <span class="lbl">C.P.:</span>
        <span class="val">{{ $asp->codigo_postal ?? '' }}</span>
      </td>
    </tr>
    <tr>
      <td class="campo">
        <span class="lbl">TELÉFONO:</span>
        <span class="val">{{ $asp->telefono ?? '—' }}</span>
      </td>
      <td class="campo">
        <span class="lbl">E-MAIL:</span>
        <span class="val">{{ $asp->email }}</span>
      </td>
    </tr>
  </table>

  {{-- ── Carrera ── --}}
  <div class="sec-title">Carrera</div>
  <table class="fila">
    <tr>
      <td class="campo">
        <span class="lbl">CARRERA A CURSAR:</span>
        <span class="val">{{ mb_strtoupper($carr->nombre, 'UTF-8') }}</span>
      </td>
    </tr>
  </table>

  {{-- ── Escuela de procedencia ── --}}
  <div class="sec-title">Escuela de Procedencia</div>
  <table class="fila">
    <tr>
      <td style="width:75%;" class="campo">
        <span class="lbl">NOMBRE DE LA ESCUELA:</span>
        <span class="val">{{ mb_strtoupper($asp->escuela_bachillerato, 'UTF-8') }}</span>
      </td>
      <td class="campo">
        <span class="lbl">PROMEDIO:</span>
        <span class="val">{{ number_format($asp->promedio_bachillerato, 1) }}</span>
      </td>
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

    <p class="nota">El checklist refleja el estado actual de documentos registrados en el expediente digital.</p>

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
        <div class="firma-nombre">
          {{ mb_strtoupper($asp->apellido_paterno, 'UTF-8') }}
          {{ mb_strtoupper($asp->apellido_materno ?? '', 'UTF-8') }},
          {{ mb_strtoupper($asp->nombres, 'UTF-8') }}
        </div>
        <div class="firma-cargo">Nombre y Firma del Aspirante</div>
      </td>
      <td style="width:50%;">

        <div class="firma-nombre">
          {{ mb_strtoupper($jefeControlEscolar?->name ?? 'SELLO Y FIRMA', 'UTF-8') }}
        </div>
        <div class="firma-cargo">Departamento de Control Escolar</div>
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

</body>
</html>

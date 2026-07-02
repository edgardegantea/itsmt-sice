@php
  $AZUL   = '#1a3a5c';
  $sol    = $solicitud->solicitante;
  $tipo   = $solicitud->tipo;
  $inicio = $solicitud->fecha_inicio?->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
  $fin    = $solicitud->fecha_fin?->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
  $hoy    = now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; }
    .header { text-align:center; border-bottom: 3px solid {{ $AZUL }}; padding-bottom:10px; margin-bottom:20px; }
    .header h1 { color: {{ $AZUL }}; font-size: 14pt; letter-spacing: 1px; }
    .header p { font-size: 9pt; color: #555; margin-top:4px; }
    .folio { text-align:right; font-size:9pt; color:#555; margin-bottom:16px; }
    .section { margin-bottom: 18px; }
    .section h2 { color: {{ $AZUL }}; font-size: 11pt; border-bottom: 1px solid #ccc; padding-bottom:3px; margin-bottom:8px; }
    .row { display:flex; margin-bottom:5px; font-size:10pt; }
    .label { color:#555; width:180px; flex-shrink:0; }
    .value { font-weight:bold; }
    .motivo { background:#f5f7fa; border-left:4px solid {{ $AZUL }}; padding:10px 14px; font-size:10pt; line-height:1.5; }
    .firma-block { margin-top:50px; display:flex; justify-content:space-between; }
    .firma { text-align:center; width:45%; border-top:1px solid #333; padding-top:6px; font-size:9pt; }
    .footer { margin-top:30px; text-align:center; font-size:8pt; color:#888; }
    .badge { display:inline-block; background:#28a745; color:#fff; padding:3px 10px; border-radius:4px; font-size:9pt; font-weight:bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INSTITUTO TECNOLÓGICO SUPERIOR DE MISANTLA</h1>
    <p>Subdirección Académica — Departamento de Recursos Humanos</p>
    <p>TecNM — Documento Oficial de Permiso</p>
  </div>

  <div class="folio">
    <strong>Folio:</strong> {{ strtoupper(substr($solicitud->id, 0, 8)) }} &nbsp;|&nbsp;
    <span class="badge">APROBADO</span> &nbsp;|&nbsp;
    <strong>Fecha de emisión:</strong> {{ $hoy }}
  </div>

  <div class="section">
    <h2>Datos del Solicitante</h2>
    <div class="row"><span class="label">Nombre:</span><span class="value">{{ $sol?->name ?? '—' }}</span></div>
    <div class="row"><span class="label">Correo institucional:</span><span class="value">{{ $sol?->email ?? '—' }}</span></div>
  </div>

  <div class="section">
    <h2>Datos del Permiso</h2>
    <div class="row"><span class="label">Tipo de permiso:</span><span class="value">{{ $tipo?->nombre ?? '—' }}</span></div>
    <div class="row"><span class="label">Fecha de inicio:</span><span class="value">{{ $inicio }}</span></div>
    <div class="row"><span class="label">Fecha de término:</span><span class="value">{{ $fin }}</span></div>
    <div class="row">
      <span class="label">Días hábiles:</span>
      <span class="value">
        {{ max(0, $solicitud->fecha_inicio && $solicitud->fecha_fin
            ? \Carbon\CarbonPeriod::create($solicitud->fecha_inicio, $solicitud->fecha_fin)
                ->filter('isWeekday')->count()
            : 0) }} día(s) hábil(es)
      </span>
    </div>
  </div>

  <div class="section">
    <h2>Motivo</h2>
    <div class="motivo">{{ $solicitud->motivo }}</div>
  </div>

  @if($solicitud->observaciones)
  <div class="section">
    <h2>Observaciones de la Dirección</h2>
    <p>{{ $solicitud->observaciones }}</p>
  </div>
  @endif

  <div class="firma-block">
    <div class="firma">
      {{ $sol?->name ?? 'Solicitante' }}<br>
      <small>Personal solicitante</small>
    </div>
    <div class="firma">
      {{ $solicitud->atendidaPor?->name ?? 'Director Académico' }}<br>
      <small>Director Académico</small>
    </div>
  </div>

  <div class="footer">
    Documento generado automáticamente — ITSMT SICE &bull; {{ $hoy }}
  </div>
</body>
</html>

@php
  $AZUL   = '#1a3a5c';
  $per    = $comision->personal;
  $dir    = $comision->asignadaPor;
  $inicio = $comision->fecha_inicio?->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
  $fin    = $comision->fecha_fin?->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
  $hoy    = now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
  $folio  = 'COM-' . strtoupper(substr($comision->id, 0, 8));
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; }
    .header { display:flex; justify-content:space-between; align-items:center; border-bottom: 3px solid {{ $AZUL }}; padding-bottom:10px; margin-bottom:20px; }
    .header h1 { color: {{ $AZUL }}; font-size: 13pt; }
    .header p { font-size: 9pt; color: #555; }
    .folio { text-align:right; font-size:9pt; color:#555; margin-bottom:20px; }
    h2 { color: {{ $AZUL }}; font-size: 11pt; border-bottom: 1px solid #ccc; padding-bottom:3px; margin:16px 0 8px; }
    .row { display:flex; margin-bottom:5px; font-size:10pt; }
    .label { color:#555; width:200px; flex-shrink:0; }
    .value { font-weight:bold; }
    .proposito { background:#f5f7fa; border-left:4px solid {{ $AZUL }}; padding:10px 14px; font-size:10pt; line-height:1.5; }
    .viaticos { background:#fff8e1; border:1px solid #f0c040; padding:8px 12px; border-radius:4px; margin-top:10px; }
    .firma-block { margin-top:60px; display:flex; justify-content:flex-end; }
    .firma { text-align:center; width:45%; border-top:1px solid #333; padding-top:6px; font-size:9pt; }
    .footer { margin-top:30px; text-align:center; font-size:8pt; color:#888; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>INSTITUTO TECNOLÓGICO SUPERIOR DE MISANTLA</h1>
      <p>Subdirección Académica</p>
    </div>
    <div style="text-align:right">
      <p style="font-size:9pt; color:#555;">Oficio Núm. <strong>{{ $folio }}</strong></p>
      <p style="font-size:9pt; color:#555;">Misantla, Ver., {{ $hoy }}</p>
    </div>
  </div>

  <p style="margin-bottom:20px; font-size:11pt;">
    Por medio del presente se hace constar que el (la) C. <strong>{{ $per?->name ?? '—' }}</strong>
    adscrito(a) a esta institución, ha sido designado(a) en
    <strong>COMISIÓN OFICIAL</strong> en los siguientes términos:
  </p>

  <h2>Detalles de la Comisión</h2>
  <div class="row"><span class="label">Destino:</span><span class="value">{{ $comision->destino }}</span></div>
  <div class="row"><span class="label">Fecha de inicio:</span><span class="value">{{ $inicio }}</span></div>
  <div class="row"><span class="label">Fecha de regreso:</span><span class="value">{{ $fin }}</span></div>

  <h2>Propósito</h2>
  <div class="proposito">{{ $comision->proposito }}</div>

  @if($comision->con_viaticos)
  <div class="viaticos">
    <strong>Viáticos autorizados:</strong>
    ${{ number_format($comision->monto_viaticos ?? 0, 2) }} MXN
  </div>
  @endif

  <div class="firma-block">
    <div class="firma">
      {{ $dir?->name ?? 'Director Académico' }}<br>
      <small>Director Académico</small><br>
      <small>Instituto Tecnológico Superior de Misantla</small>
    </div>
  </div>

  <div class="footer">
    Documento generado automáticamente — ITSMT SICE &bull; {{ $hoy }}
  </div>
</body>
</html>

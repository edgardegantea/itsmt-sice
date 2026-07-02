<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; margin: 0; color: #1a1a1a; }
  .header { text-align: center; border-bottom: 2px solid #1a3a5c; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 13pt; color: #1a3a5c; margin: 4px 0; text-transform: uppercase; }
  .header h2 { font-size: 11pt; color: #1a3a5c; margin: 2px 0; }
  .oficio { text-align: right; font-size: 9pt; color: #555; margin-bottom: 16px; }
  .cuerpo { line-height: 1.8; margin-bottom: 16px; }
  table.datos { width: 100%; border-collapse: collapse; margin: 14px 0; }
  table.datos td { padding: 6px 10px; border: 1px solid #ccc; font-size: 10pt; }
  table.datos td:first-child { font-weight: bold; background: #f0f4f8; width: 35%; }
  .sinodales { margin: 14px 0; }
  .sinodal-item { padding: 4px 0; font-size: 10pt; border-bottom: 1px dashed #ddd; }
  .alerta { background: #fff8e1; border: 1px solid #f0c000; padding: 10px 14px; border-radius: 4px; font-size: 9.5pt; margin: 12px 0; }
  .firmas { margin-top: 60px; text-align: center; }
  .firma { display: inline-block; text-align: center; width: 220px; }
  .firma .linea { border-top: 1px solid #333; margin-bottom: 6px; }
  .firma p { font-size: 9pt; margin: 0; }
  .footer { margin-top: 40px; font-size: 8pt; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
</style>
</head>
<body>
<div class="header">
  <h2>Instituto Tecnológico Superior de Misantla</h2>
  <h1>Aviso de Realización del Acto Protocolario</h1>
  <p style="font-size:9pt; color:#555; margin:0;">Formato TecNM-AC-PO-006-03</p>
</div>

<div class="oficio">
  <strong>No. Aviso:</strong> ARA-{{ strtoupper(substr($acto->id, 0, 8)) }}<br>
  <strong>Fecha de expedición:</strong> {{ now()->isoFormat('D [de] MMMM [de] YYYY') }}
</div>

<div class="cuerpo">
  <p>Se comunica a los Sinodales integrantes del Jurado que el Acto Protocolario de Titulación descrito a continuación
  ha sido programado. Su asistencia es <strong>obligatoria</strong> con un mínimo de <strong>3 días hábiles</strong> de anticipación a la fecha indicada
  (política 3.4 TecNM-AC-PO-006).</p>
</div>

<table class="datos">
  <tr><td>Alumno</td><td>{{ $acto->solicitud->alumno->user->name }}</td></tr>
  <tr><td>No. de control</td><td>{{ $acto->solicitud->alumno->numero_control }}</td></tr>
  <tr><td>Carrera</td><td>{{ $acto->solicitud->alumno->carrera->nombre ?? '—' }}</td></tr>
  <tr><td>Modalidad</td><td>Opción {{ $acto->solicitud->modalidad->opcion_numero }} — {{ $acto->solicitud->modalidad->nombre }}</td></tr>
  <tr><td>Fecha del acto</td><td>{{ \Carbon\Carbon::parse($acto->fecha)->isoFormat('dddd D [de] MMMM [de] YYYY') }}</td></tr>
  <tr><td>Hora</td><td>{{ $acto->hora }}</td></tr>
  <tr><td>Lugar</td><td>{{ $acto->lugar }}</td></tr>
  @if($acto->libro_actas_folio)
  <tr><td>Folio libro de actas</td><td>{{ $acto->libro_actas_folio }}</td></tr>
  @endif
</table>

@if(!empty($acto->sinodales_json))
<div class="sinodales">
  <p style="font-weight:bold; margin-bottom:6px; color:#1a3a5c;">Jurado designado:</p>
  @foreach($acto->sinodales_json as $sinodal)
  <div class="sinodal-item">
    <strong>{{ $sinodal['nombre'] ?? '—' }}</strong> — {{ $sinodal['rol_sinodal'] ?? '—' }}
  </div>
  @endforeach
</div>
@endif

<div class="alerta">
  <strong>Nota:</strong> Este aviso fue generado automáticamente por el Sistema SICE. En caso de impedimento, notifique
  con la debida anticipación a la División de Estudios Profesionales.
</div>

<div class="firmas">
  <div class="firma">
    <div class="linea"></div>
    <p><strong>Jefe de División de Estudios Profesionales</strong></p>
    <p>Instituto Tecnológico Superior de Misantla</p>
  </div>
</div>

<div class="footer">
  ITSMT — Sistema Integral de Control Escolar · TecNM-AC-PO-006-03 · Generado el {{ now()->isoFormat('D/MM/YYYY HH:mm') }}
</div>
</body>
</html>

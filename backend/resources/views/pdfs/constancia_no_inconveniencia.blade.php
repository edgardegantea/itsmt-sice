<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; margin: 0; color: #1a1a1a; }
  .header { text-align: center; border-bottom: 2px solid #1a3a5c; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 13pt; color: #1a3a5c; margin: 4px 0; text-transform: uppercase; letter-spacing: 1px; }
  .header h2 { font-size: 11pt; color: #1a3a5c; margin: 2px 0; }
  .oficio { text-align: right; font-size: 9pt; color: #555; margin-bottom: 16px; }
  .cuerpo { line-height: 1.8; margin-bottom: 20px; }
  .cuerpo strong { color: #1a3a5c; }
  table.datos { width: 100%; border-collapse: collapse; margin: 16px 0; }
  table.datos td { padding: 6px 10px; border: 1px solid #ccc; font-size: 10pt; }
  table.datos td:first-child { font-weight: bold; background: #f0f4f8; width: 40%; }
  .badge { display: inline-block; background: #1a3a5c; color: white; padding: 4px 14px; border-radius: 4px; font-size: 10pt; font-weight: bold; margin: 8px 0; }
  .firmas { margin-top: 60px; display: flex; justify-content: space-around; }
  .firma { text-align: center; width: 200px; }
  .firma .linea { border-top: 1px solid #333; margin-bottom: 6px; }
  .firma p { font-size: 9pt; margin: 0; }
  .footer { margin-top: 40px; font-size: 8pt; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
</style>
</head>
<body>
<div class="header">
  <h2>Instituto Tecnológico Superior de Misantla</h2>
  <h1>Constancia de No Inconveniencia</h1>
  <p style="font-size:9pt; color:#555; margin:0;">Formato TecNM-AC-PO-006-02 — Acto Protocolario para la Titulación Integral</p>
</div>

<div class="oficio">
  <strong>No. Constancia:</strong> CNI-{{ strtoupper(substr($constancia->id, 0, 8)) }}<br>
  <strong>Fecha de emisión:</strong> {{ \Carbon\Carbon::parse($constancia->fecha_emision)->isoFormat('D [de] MMMM [de] YYYY') }}
</div>

<div class="cuerpo">
  <p>El Departamento de Servicios Escolares del <strong>Instituto Tecnológico Superior de Misantla</strong>, con fundamento en el
  Procedimiento TecNM-AC-PO-006 (Acto Protocolario para la Titulación Integral), hace constar que se ha revisado
  el expediente escolar del alumno que a continuación se identifica y que <strong>no existe inconveniencia</strong> para
  que proceda con el Acto Protocolario de titulación en la modalidad seleccionada.</p>
</div>

<div class="badge">EXPEDIENTE PROCEDENTE</div>

<table class="datos">
  <tr><td>Nombre del alumno</td><td>{{ $solicitud->alumno->user->name }}</td></tr>
  <tr><td>No. de control</td><td>{{ $solicitud->alumno->numero_control }}</td></tr>
  <tr><td>Carrera</td><td>{{ $solicitud->alumno->carrera->nombre ?? '—' }}</td></tr>
  <tr><td>Modalidad de titulación</td><td>Opción {{ $solicitud->modalidad->opcion_numero }} — {{ $solicitud->modalidad->nombre }}</td></tr>
  <tr><td>Fecha de solicitud</td><td>{{ \Carbon\Carbon::parse($solicitud->created_at)->isoFormat('D [de] MMMM [de] YYYY') }}</td></tr>
  <tr><td>Emitida por</td><td>{{ $constancia->emitidaPor->name ?? '—' }}</td></tr>
</table>

<p style="font-size:10pt; margin-top:16px;">Se extiende la presente Constancia de No Inconveniencia para los fines que convengan al interesado, con
fundamento en la política 3.3 del Procedimiento TecNM-AC-PO-006.</p>

<div class="firmas">
  <div class="firma">
    <div class="linea"></div>
    <p><strong>{{ $constancia->emitidaPor->name ?? 'Responsable' }}</strong></p>
    <p>Jefe de Servicios Escolares</p>
  </div>
  <div class="firma">
    <div class="linea"></div>
    <p><strong>Director del Instituto</strong></p>
    <p>Instituto Tecnológico Superior de Misantla</p>
  </div>
</div>

<div class="footer">
  ITSMT — Sistema Integral de Control Escolar · TecNM-AC-PO-006-02 · Documento generado el {{ now()->isoFormat('D/MM/YYYY') }}
</div>
</body>
</html>

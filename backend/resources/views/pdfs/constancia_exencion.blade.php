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
  .cuerpo { line-height: 1.9; margin-bottom: 18px; text-align: justify; }
  .badge-exento { display: inline-block; background: #7c3aed; color: white; padding: 5px 18px; border-radius: 4px; font-size: 12pt; font-weight: bold; margin: 10px 0; }
  table.datos { width: 100%; border-collapse: collapse; margin: 14px 0; }
  table.datos td { padding: 6px 10px; border: 1px solid #ccc; font-size: 10pt; }
  table.datos td:first-child { font-weight: bold; background: #f3f0ff; width: 38%; }
  .firmas { margin-top: 60px; display: flex; justify-content: space-around; }
  .firma { text-align: center; width: 200px; }
  .firma .linea { border-top: 1px solid #333; margin-bottom: 6px; }
  .firma p { font-size: 9pt; margin: 2px 0; }
  .footer { margin-top: 40px; font-size: 8pt; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
</style>
</head>
<body>
<div class="header">
  <h2>Instituto Tecnológico Superior de Misantla</h2>
  <h1>Constancia de Exención de Examen Profesional</h1>
  <p style="font-size:9pt; color:#555; margin:0;">Modalidades VIII, IX y Titulación Integral — TecNM-AC-PO-006</p>
</div>

<div class="oficio">
  <strong>No. Constancia:</strong> CEX-{{ strtoupper(substr($acto->id, 0, 8)) }}<br>
  <strong>Fecha:</strong> {{ \Carbon\Carbon::parse($acto->fecha)->isoFormat('D [de] MMMM [de] YYYY') }}
</div>

<div class="cuerpo">
  <p>El <strong>Instituto Tecnológico Superior de Misantla</strong>, con fundamento en el Procedimiento
  <strong>TecNM-AC-PO-006</strong> (Acto Protocolario para la Titulación Integral), hace constar que el alumno
  identificado a continuación ha cumplido satisfactoriamente con todos los requisitos de la modalidad de
  titulación seleccionada, misma que conforme al Manual de Titulación TecNM <strong>no requiere de examen
  profesional oral</strong>, por lo que queda <strong>EXENTO</strong> del mismo y se le otorga el presente documento
  para los fines legales correspondientes.</p>
</div>

<div class="badge-exento">EXENTO DE EXAMEN PROFESIONAL</div>

<table class="datos">
  <tr><td>Nombre del alumno</td><td>{{ $acto->solicitud->alumno->user->name }}</td></tr>
  <tr><td>No. de control</td><td>{{ $acto->solicitud->alumno->numero_control }}</td></tr>
  <tr><td>Carrera</td><td>{{ $acto->solicitud->alumno->carrera->nombre ?? '—' }}</td></tr>
  <tr><td>Modalidad de titulación</td><td>Opción {{ $acto->solicitud->modalidad->opcion_numero }} — {{ $acto->solicitud->modalidad->nombre }}</td></tr>
  <tr><td>Fecha de celebración</td><td>{{ \Carbon\Carbon::parse($acto->fecha)->isoFormat('D [de] MMMM [de] YYYY') }}</td></tr>
</table>

<div class="firmas">
  <div class="firma">
    <div class="linea"></div>
    <p><strong>Jefe de Servicios Escolares</strong></p>
    <p>Instituto Tecnológico Superior de Misantla</p>
  </div>
  <div class="firma">
    <div class="linea"></div>
    <p><strong>Director del Instituto</strong></p>
    <p>Instituto Tecnológico Superior de Misantla</p>
  </div>
</div>

<div class="footer">
  ITSMT · Constancia de Exención · Documento permanente — TecNM-AC-PO-006 · Generado el {{ now()->isoFormat('D/MM/YYYY') }}
</div>
</body>
</html>

<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; margin: 0; color: #1a1a1a; }
  .header { text-align: center; border-bottom: 3px double #1a3a5c; padding-bottom: 14px; margin-bottom: 22px; }
  .header h1 { font-size: 14pt; color: #1a3a5c; margin: 6px 0; text-transform: uppercase; letter-spacing: 1px; }
  .header h2 { font-size: 11pt; color: #1a3a5c; margin: 2px 0; }
  .sello { text-align: center; margin: 10px 0; }
  .sello .badge-aprobado { display: inline-block; background: #16a34a; color: white; padding: 6px 22px; border-radius: 6px; font-size: 13pt; font-weight: bold; letter-spacing: 2px; }
  table.datos { width: 100%; border-collapse: collapse; margin: 16px 0; }
  table.datos td { padding: 7px 10px; border: 1px solid #aaa; font-size: 10pt; }
  table.datos td:first-child { font-weight: bold; background: #e8f0f8; width: 38%; }
  .cuerpo { line-height: 1.9; margin: 16px 0; text-align: justify; }
  .firmas { margin-top: 70px; display: flex; justify-content: space-around; }
  .firma { text-align: center; width: 180px; }
  .firma .linea { border-top: 1px solid #333; margin-bottom: 6px; }
  .firma p { font-size: 9pt; margin: 2px 0; }
  .footer { margin-top: 40px; font-size: 8pt; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
</style>
</head>
<body>
<div class="header">
  <h2>Instituto Tecnológico Superior de Misantla</h2>
  <h1>Acta de Examen Profesional</h1>
  <p style="font-size:9pt; color:#555; margin:2px 0;">Titulación Integral — TecNM-AC-PO-006</p>
</div>

<div class="sello">
  <span class="badge-aprobado">APROBADO</span>
</div>

<div class="cuerpo">
  <p>En Misantla, Veracruz, siendo las <strong>{{ $acto->hora }}</strong> horas del día
  <strong>{{ \Carbon\Carbon::parse($acto->fecha)->isoFormat('D [de] MMMM [de] YYYY') }}</strong>,
  reunidos en <strong>{{ $acto->lugar }}</strong>, los integrantes del jurado designado y
  el sustentante que a continuación se identifica, se celebró el <strong>Acto Protocolario de Titulación Integral</strong>
  con el resultado que se indica.</p>
</div>

<table class="datos">
  <tr><td>Nombre del sustentante</td><td>{{ $acto->solicitud->alumno->user->name }}</td></tr>
  <tr><td>No. de control</td><td>{{ $acto->solicitud->alumno->numero_control }}</td></tr>
  <tr><td>Carrera</td><td>{{ $acto->solicitud->alumno->carrera->nombre ?? '—' }}</td></tr>
  <tr><td>Modalidad de titulación</td><td>Opción {{ $acto->solicitud->modalidad->opcion_numero }} — {{ $acto->solicitud->modalidad->nombre }}</td></tr>
  <tr><td>Resultado</td><td><strong style="color:#16a34a;">APROBADO</strong></td></tr>
</table>

@if(!empty($acto->sinodales_json))
<p style="font-weight:bold; color:#1a3a5c; margin-top:14px;">Jurado:</p>
<table class="datos">
  @foreach($acto->sinodales_json as $sinodal)
  <tr><td>{{ $sinodal['rol_sinodal'] ?? 'Sinodal' }}</td><td>{{ $sinodal['nombre'] ?? '—' }}</td></tr>
  @endforeach
</table>
@endif

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
  ITSMT · Acta de Examen Profesional · Documento permanente — TecNM-AC-PO-006 · Generado el {{ now()->isoFormat('D/MM/YYYY') }}
</div>
</body>
</html>

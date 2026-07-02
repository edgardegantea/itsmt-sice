<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; margin: 40px; color: #1a1a1a; }
    h1 { font-size: 14pt; text-align: center; text-transform: uppercase; }
    .meta { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; }
    th { background: #e8f0f8; font-weight: bold; }
    .firma { margin-top: 60px; text-align: center; }
    .linea { border-top: 1px solid #333; width: 250px; margin: 0 auto; }
  </style>
</head>
<body>
  <h1>Oficio de Apertura de Especialidad</h1>
  <h2 style="text-align:center;font-size:12pt;">Instituto Tecnológico Superior de Martínez de la Torre</h2>
  <div class="meta">
    <p><strong>Fecha:</strong> {{ now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY') }}</p>
  </div>
  <table>
    <tr><th>Campo</th><th>Valor</th></tr>
    <tr><td>Especialidad</td><td>{{ $especialidad->nombre }}</td></tr>
    <tr><td>Carrera</td><td>{{ $especialidad->carrera?->nombre }}</td></tr>
    <tr><td>Estatus</td><td>{{ ucfirst($especialidad->estatus) }}</td></tr>
    <tr><td>% créditos mínimo</td><td>{{ $especialidad->porcentaje_creditos_min }}%</td></tr>
    @if($especialidad->descripcion)
    <tr><td>Descripción</td><td>{{ $especialidad->descripcion }}</td></tr>
    @endif
    @if($especialidad->autorizadaPor)
    <tr><td>Autorizada por</td><td>{{ $especialidad->autorizadaPor->name }}</td></tr>
    @endif
  </table>

  <div class="firma">
    <p>&nbsp;</p>
    <div class="linea"></div>
    <p>Firma del Director Académico</p>
  </div>
</body>
</html>

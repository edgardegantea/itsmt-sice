<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; font-size:8pt; color:#1a1a1a; }
.header { text-align:center; border-bottom:2px solid #1a3a5c; padding-bottom:8px; margin-bottom:12px; }
.header h1 { font-size:11pt; color:#1a3a5c; }
table { width:100%; border-collapse:collapse; }
th { background:#1a3a5c; color:#fff; padding:4px 6px; font-size:8pt; text-align:left; }
td { padding:3px 6px; border-bottom:1px solid #ddd; font-size:7.5pt; }
tr:nth-child(even) td { background:#f0f4f8; }
</style>
</head>
<body>
<div class="header">
  <h1>INSTITUTO TECNOLÓGICO SUPERIOR DE MISANTLA</h1>
  <h2>DIRECTORIO DE PERSONAL DOCENTE</h2>
  <p>Total: {{ $datos->count() }} docentes &nbsp;|&nbsp; Generado: {{ now()->format('d/m/Y') }}</p>
</div>
<table>
  <thead>
    <tr>
      <th>#</th><th>Nombre Completo</th><th>Especialidad</th>
      <th>Tipo Contrato</th><th>Correo</th>
    </tr>
  </thead>
  <tbody>
    @foreach($datos as $i => $docente)
    <tr>
      <td>{{ $i + 1 }}</td>
      <td>{{ $docente->nombre_completo ?? '—' }}</td>
      <td>{{ $docente->fichaDocente?->categoria ?? '—' }}</td>
      <td>{{ $docente->fichaDocente?->tipo_contrato ?? '—' }}</td>
      <td>{{ $docente->email ?? '—' }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
</body>
</html>

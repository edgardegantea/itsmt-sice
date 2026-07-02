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
  <h2>DIRECTORIO DE ALUMNOS ACTIVOS</h2>
  <p>Total: {{ $datos->count() }} alumnos &nbsp;|&nbsp; Generado: {{ now()->format('d/m/Y') }}</p>
</div>
<table>
  <thead>
    <tr>
      <th>#</th><th>Número de Control</th><th>Nombre Completo</th>
      <th>Carrera</th><th>Semestre</th><th>Estatus</th><th>Correo</th>
    </tr>
  </thead>
  <tbody>
    @foreach($datos as $i => $alumno)
    <tr>
      <td>{{ $i + 1 }}</td>
      <td>{{ $alumno->numero_control ?? '—' }}</td>
      <td>{{ $alumno->user?->nombre_completo ?? '—' }}</td>
      <td>{{ $alumno->carrera?->nombre ?? '—' }}</td>
      <td>{{ $alumno->semestre_actual ?? '—' }}</td>
      <td>{{ ucfirst($alumno->estatus ?? '—') }}</td>
      <td>{{ $alumno->user?->email ?? '—' }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
</body>
</html>

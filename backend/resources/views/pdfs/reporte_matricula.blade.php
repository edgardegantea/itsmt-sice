<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; font-size:9pt; color:#1a1a1a; }
.header { text-align:center; border-bottom:2px solid #1a3a5c; padding-bottom:8px; margin-bottom:12px; }
.header h1 { font-size:12pt; color:#1a3a5c; }
.header h2 { font-size:10pt; }
table { width:100%; border-collapse:collapse; margin-bottom:16px; }
th { background:#1a3a5c; color:#fff; padding:5px 6px; font-size:8pt; text-align:left; }
td { padding:4px 6px; border-bottom:1px solid #ddd; font-size:8pt; }
tr:nth-child(even) td { background:#f0f4f8; }
.section-title { background:#e8eef5; padding:4px 6px; font-weight:bold; font-size:9pt; margin:10px 0 4px; border-left:4px solid #1a3a5c; }
.totals { margin-top:8px; font-size:9pt; }
.totals td { border:none; padding:2px 6px; }
</style>
</head>
<body>
<div class="header">
  <h1>INSTITUTO TECNOLÓGICO SUPERIOR DE MISANTLA</h1>
  <h2>REPORTE INTEGRAL DE MATRÍCULA</h2>
  <p>Periodo: {{ $periodo?->nombre ?? 'Todos los periodos' }} &nbsp;|&nbsp; Generado: {{ now()->format('d/m/Y H:i') }}</p>
</div>

<div class="section-title">INSCRITOS NUEVOS ({{ $inscritos->count() }})</div>
<table>
  <thead>
    <tr>
      <th>#</th><th>Número de Control</th><th>Nombre</th><th>Carrera</th><th>Semestre</th><th>Tipo Ingreso</th>
    </tr>
  </thead>
  <tbody>
    @forelse($inscritos as $i => $alumno)
    <tr>
      <td>{{ $i + 1 }}</td>
      <td>{{ $alumno->numero_control ?? '—' }}</td>
      <td>{{ $alumno->user?->nombre_completo ?? '—' }}</td>
      <td>{{ $alumno->carrera?->nombre ?? '—' }}</td>
      <td>{{ $alumno->semestre_actual ?? '—' }}</td>
      <td>{{ $alumno->inscripcion?->tipo_ingreso ?? '—' }}</td>
    </tr>
    @empty
    <tr><td colspan="6" style="text-align:center;">Sin registros</td></tr>
    @endforelse
  </tbody>
</table>

<div class="section-title">REINSCRIPCIONES APROBADAS ({{ $reinscripciones->count() }})</div>
<table>
  <thead>
    <tr><th>#</th><th>Número de Control</th><th>Nombre</th><th>Carrera</th></tr>
  </thead>
  <tbody>
    @forelse($reinscripciones as $i => $r)
    <tr>
      <td>{{ $i + 1 }}</td>
      <td>{{ $r->alumno?->numero_control ?? '—' }}</td>
      <td>{{ $r->alumno?->user?->nombre_completo ?? '—' }}</td>
      <td>{{ $r->alumno?->carrera?->nombre ?? '—' }}</td>
    </tr>
    @empty
    <tr><td colspan="4" style="text-align:center;">Sin registros</td></tr>
    @endforelse
  </tbody>
</table>

<div class="section-title">BAJAS ({{ $bajas->count() }})</div>
<table>
  <thead>
    <tr><th>#</th><th>Número de Control</th><th>Nombre</th><th>Carrera</th><th>Tipo Baja</th><th>Fecha</th></tr>
  </thead>
  <tbody>
    @forelse($bajas as $i => $b)
    <tr>
      <td>{{ $i + 1 }}</td>
      <td>{{ $b->alumno?->numero_control ?? '—' }}</td>
      <td>{{ $b->alumno?->user?->nombre_completo ?? '—' }}</td>
      <td>{{ $b->alumno?->carrera?->nombre ?? '—' }}</td>
      <td>{{ $b->tipo_baja ?? '—' }}</td>
      <td>{{ $b->fecha_solicitud?->format('d/m/Y') ?? '—' }}</td>
    </tr>
    @empty
    <tr><td colspan="6" style="text-align:center;">Sin registros</td></tr>
    @endforelse
  </tbody>
</table>

<table class="totals">
  <tr>
    <td><strong>Total inscritos nuevos:</strong> {{ $inscritos->count() }}</td>
    <td><strong>Total reinscripciones:</strong> {{ $reinscripciones->count() }}</td>
    <td><strong>Total bajas:</strong> {{ $bajas->count() }}</td>
  </tr>
</table>
</body>
</html>

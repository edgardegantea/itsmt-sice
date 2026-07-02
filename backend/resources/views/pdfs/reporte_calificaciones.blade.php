<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; font-size:8pt; color:#1a1a1a; }
.header { text-align:center; border-bottom:2px solid #1a3a5c; padding-bottom:8px; margin-bottom:12px; }
.header h1 { font-size:11pt; color:#1a3a5c; }
table { width:100%; border-collapse:collapse; margin-bottom:14px; }
th { background:#1a3a5c; color:#fff; padding:4px 5px; font-size:7.5pt; text-align:left; }
td { padding:3px 5px; border-bottom:1px solid #ddd; font-size:7.5pt; }
tr:nth-child(even) td { background:#f0f4f8; }
.grupo-header { background:#e8eef5; padding:4px 6px; font-weight:bold; margin:10px 0 4px; border-left:4px solid #1a3a5c; }
.acreditado { color:#15803d; font-weight:bold; }
.no-acreditado { color:#dc2626; font-weight:bold; }
</style>
</head>
<body>
<div class="header">
  <h1>INSTITUTO TECNOLÓGICO SUPERIOR DE MISANTLA</h1>
  <h2>REPORTE DE CALIFICACIONES POR CARRERA Y GRUPO</h2>
  <p>Generado: {{ now()->format('d/m/Y H:i') }}</p>
</div>

@forelse($grupos as $grupo)
<div class="grupo-header">
  Materia: {{ $grupo->materia?->nombre ?? '—' }} &nbsp;|&nbsp;
  Carrera: {{ $grupo->carrera?->nombre ?? '—' }} &nbsp;|&nbsp;
  Docente: {{ $grupo->cargas->first()?->docente?->nombre_completo ?? '—' }} &nbsp;|&nbsp;
  Periodo: {{ $grupo->periodo?->nombre ?? '—' }}
</div>
<table>
  <thead>
    <tr>
      <th>#</th><th>Número de Control</th><th>Alumno</th>
      <th>Parcial 1</th><th>Parcial 2</th><th>Parcial 3</th>
      <th>Final</th><th>Resultado</th>
    </tr>
  </thead>
  <tbody>
    @php
      $alumnos = $grupo->alumnoGrupo ?? collect();
    @endphp
    @forelse($alumnos as $i => $ag)
    <tr>
      <td>{{ $i + 1 }}</td>
      <td>{{ $ag->alumno?->numero_control ?? '—' }}</td>
      <td>{{ $ag->alumno?->nombre_completo ?? '—' }}</td>
      @php
        $cal = $grupo->calificaciones?->where('alumno_id', $ag->alumno_id)->first();
      @endphp
      <td>{{ $cal?->parcial_1 ?? '—' }}</td>
      <td>{{ $cal?->parcial_2 ?? '—' }}</td>
      <td>{{ $cal?->parcial_3 ?? '—' }}</td>
      <td>{{ $cal?->calificacion_final ?? '—' }}</td>
      <td class="{{ ($cal?->acreditado ?? false) ? 'acreditado' : 'no-acreditado' }}">
        {{ ($cal?->acreditado ?? null) === null ? '—' : ($cal->acreditado ? 'Acreditado' : 'No acreditado') }}
      </td>
    </tr>
    @empty
    <tr><td colspan="8" style="text-align:center;">Sin alumnos inscritos</td></tr>
    @endforelse
  </tbody>
</table>
@empty
<p style="text-align:center; margin-top:20px;">No hay grupos para los filtros seleccionados.</p>
@endforelse
</body>
</html>

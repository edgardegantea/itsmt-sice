<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; font-size:9pt; color:#1a1a1a; }
.header { text-align:center; border-bottom:2px solid #1a3a5c; padding-bottom:8px; margin-bottom:16px; }
.header h1 { font-size:12pt; color:#1a3a5c; }
.header h2 { font-size:10pt; }
table { width:100%; border-collapse:collapse; margin-bottom:16px; }
th { background:#1a3a5c; color:#fff; padding:6px 8px; font-size:8pt; text-align:right; }
th:first-child { text-align:left; }
td { padding:5px 8px; border-bottom:1px solid #ddd; font-size:8pt; text-align:right; }
td:first-child { text-align:left; font-weight:bold; }
tr:nth-child(even) td { background:#f0f4f8; }
.totales td { border:none; border-top:2px solid #1a3a5c; font-weight:bold; background:#e8eef5 !important; }
.positivo { color:#166534; }
.negativo { color:#991b1b; }
.footer { margin-top:20px; font-size:7pt; color:#666; text-align:center; }
</style>
</head>
<body>
<div class="header">
  <h1>{{ mb_strtoupper($institucion->nombre_institucion) }}</h1>
  <h2>REPORTE DE ALTAS Y BAJAS POR CARRERA</h2>
  <p>Periodo: {{ $periodo->nombre }} &nbsp;|&nbsp; Generado: {{ now()->format('d/m/Y H:i') }}</p>
</div>

<table>
  <thead>
    <tr>
      <th>Carrera</th>
      <th>Nuevo ingreso</th>
      <th>Reingreso</th>
      <th>Total altas</th>
      <th>Baja temporal</th>
      <th>Baja definitiva</th>
      <th>Baja parcial</th>
      <th>Total bajas</th>
      <th>Saldo neto</th>
    </tr>
  </thead>
  <tbody>
    @forelse($carreras as $c)
    <tr>
      <td>{{ $c['carrera'] }}</td>
      <td>{{ $c['altas']['nuevo_ingreso'] }}</td>
      <td>{{ $c['altas']['reingreso'] }}</td>
      <td>{{ $c['altas']['total'] }}</td>
      <td>{{ $c['bajas']['temporal'] }}</td>
      <td>{{ $c['bajas']['definitiva'] }}</td>
      <td>{{ $c['bajas']['parcial'] }}</td>
      <td>{{ $c['bajas']['total'] }}</td>
      <td class="{{ $c['saldo_neto'] >= 0 ? 'positivo' : 'negativo' }}">{{ $c['saldo_neto'] >= 0 ? '+' : '' }}{{ $c['saldo_neto'] }}</td>
    </tr>
    @empty
    <tr><td colspan="9" style="text-align:center;">Sin datos para este periodo.</td></tr>
    @endforelse
  </tbody>
  <tfoot>
    <tr class="totales">
      <td>TOTAL</td>
      <td colspan="2"></td>
      <td>{{ $totales['altas'] }}</td>
      <td colspan="3"></td>
      <td>{{ $totales['bajas'] }}</td>
      <td class="{{ $totales['saldo_neto'] >= 0 ? 'positivo' : 'negativo' }}">{{ $totales['saldo_neto'] >= 0 ? '+' : '' }}{{ $totales['saldo_neto'] }}</td>
    </tr>
  </tfoot>
</table>

<p class="footer">Las bajas parciales (de una materia, no del alumno) no restan del saldo neto de matrícula. Documento generado por SICE — {{ $institucion->nombre_corto }}.</p>
</body>
</html>

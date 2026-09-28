@include('pdfs.partials.header')

<style>
  .title { font-size: 13pt; font-weight: bold; text-align: center; margin: 10px 0 4px; color: #1a3a5c; }
  .subtitle { font-size: 9.5pt; text-align: center; color: #555; margin-bottom: 18px; }
  table.indicadores { width: 100%; border-collapse: collapse; font-size: 9pt; }
  table.indicadores th { background: #1a3a5c; color: #fff; padding: 6px 8px; text-align: left; }
  table.indicadores td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  table.indicadores tr:nth-child(even) td { background: #f8fafc; }
  .num { text-align: center; }
  .bien { color: #059669; font-weight: bold; }
  .regular { color: #b45309; font-weight: bold; }
  .mal { color: #dc2626; font-weight: bold; }
  .na { color: #94a3b8; }
  .nota { font-size: 8pt; color: #777; margin-top: 16px; }
  .leyenda { font-size: 8pt; color: #555; margin-top: 4px; }
</style>

<div class="title">Indicadores Educativos para Fines de Acreditación</div>
<div class="subtitle">
  Periodo: {{ $periodo->nombre }}
  @if($generacion) &middot; Generación {{ $generacion }} (eficiencia terminal) @endif
  &middot; Generado el {{ now()->format('d/m/Y H:i') }}
</div>

<table class="indicadores">
  <thead>
    <tr>
      <th>Programa Educativo</th>
      <th class="num">Matrícula activa</th>
      <th class="num">Promedio general</th>
      <th class="num">% Aprobación</th>
      <th class="num">% Reprobación</th>
      <th class="num">% Deserción histórica</th>
      <th class="num">Eficiencia terminal{{ $generacion ? '' : ' *' }}</th>
    </tr>
  </thead>
  <tbody>
    @foreach($filas as $fila)
      @php
        $claseAprobacion = $fila['pct_aprobacion'] === null ? 'na' : ($fila['pct_aprobacion'] >= 80 ? 'bien' : ($fila['pct_aprobacion'] >= 60 ? 'regular' : 'mal'));
        $claseDesercion = $fila['pct_desercion'] === null ? 'na' : ($fila['pct_desercion'] <= 10 ? 'bien' : ($fila['pct_desercion'] <= 25 ? 'regular' : 'mal'));
      @endphp
      <tr>
        <td>{{ $fila['carrera'] }}</td>
        <td class="num">{{ $fila['matricula_activa'] }}</td>
        <td class="num">{{ $fila['promedio_general'] ?? '—' }}</td>
        <td class="num {{ $claseAprobacion }}">{{ $fila['pct_aprobacion'] !== null ? $fila['pct_aprobacion'].'%' : '—' }}</td>
        <td class="num">{{ $fila['pct_reprobacion'] !== null ? $fila['pct_reprobacion'].'%' : '—' }}</td>
        <td class="num {{ $claseDesercion }}">{{ $fila['pct_desercion'] !== null ? $fila['pct_desercion'].'%' : '—' }}</td>
        <td class="num">{{ $fila['eficiencia_terminal'] !== null ? $fila['eficiencia_terminal'].'%' : '—' }}</td>
      </tr>
    @endforeach
  </tbody>
</table>

<div class="leyenda">
  % Aprobación / % Deserción: <span class="bien">verde</span> = dentro de rango esperado ·
  <span class="regular">ámbar</span> = atención ·
  <span class="mal">rojo</span> = crítico.
</div>

@if(!$generacion)
  <p class="nota">* La eficiencia terminal requiere especificar una generación (año de ingreso) al generar el reporte; no se calculó en esta versión.</p>
@endif

<p class="nota">
  Promedio y reprobación calculados sobre las calificaciones finales capturadas en el periodo seleccionado.
  Deserción calculada como bajas definitivas históricas sobre el total de alumnos alguna vez inscritos en la carrera.
</p>

</body>
</html>

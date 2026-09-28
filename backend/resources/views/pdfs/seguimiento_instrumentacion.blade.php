<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Seguimiento de instrumentación didáctica</title>
<style>
    body { font-family: Arial, sans-serif; font-size:9pt; color:#1a1a1a; }
    .header { text-align:center; border-bottom:2px solid #1a3a5c; padding-bottom:8px; margin-bottom:12px; }
    .header h1 { font-size:12pt; color:#1a3a5c; margin:0 0 4px; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    th { background:#1a3a5c; color:#fff; padding:5px 6px; font-size:8pt; text-align:left; }
    td { padding:4px 6px; border-bottom:1px solid #ddd; font-size:8pt; }
    tr:nth-child(even) td { background:#f0f4f8; }
    .section-title { background:#e8eef5; padding:4px 6px; font-weight:bold; font-size:9pt; margin:10px 0 4px; border-left:4px solid #1a3a5c; }
    .badge { display:inline-block; padding:2px 6px; border-radius:4px; font-size:7.5pt; font-weight:bold; color:#fff; }
    .badge-red { background:#b91c1c; }
    .badge-amber { background:#b45309; }
    .num { text-align:right; }
    .resumen { display:flex; gap:20px; margin-bottom:14px; }
</style>
</head>
<body>
    <div class="header">
        <h1>Seguimiento de instrumentación didáctica</h1>
        <p>Unidades con dosificación atrasada y evaluaciones vencidas — {{ now()->format('d/m/Y') }}</p>
    </div>

    <p>Total de unidades con atraso: <strong>{{ $total_atrasos }}</strong> — Evaluaciones vencidas sin cerrar: <strong>{{ $total_evaluaciones_vencidas }}</strong></p>

    <div class="section-title">Detalle por unidad</div>
    <table>
        <thead>
            <tr>
                <th>Docente</th>
                <th>Materia</th>
                <th>Unidad</th>
                <th>Sem. actual</th>
                <th>Última sem. contenido</th>
                <th>Atraso</th>
                <th>Sem. evaluación</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @forelse($filas as $f)
            <tr>
                <td>{{ $f['docente'] ?? '—' }}</td>
                <td>{{ $f['materia'] ?? '—' }}</td>
                <td>Unidad {{ $f['unidad'] }}@if($f['nombre_unidad']) — {{ $f['nombre_unidad'] }}@endif</td>
                <td class="num">{{ $f['semana_actual'] }}</td>
                <td class="num">{{ $f['ultima_semana_contenido'] ?? '—' }}</td>
                <td class="num">{{ $f['atraso_dosificacion_semanas'] > 0 ? $f['atraso_dosificacion_semanas'] . ' sem' : '—' }}</td>
                <td class="num">{{ $f['semana_evaluacion'] ?? '—' }}</td>
                <td>
                    @if($f['evaluacion_vencida'])
                        <span class="badge badge-red">Evaluación vencida</span>
                    @elseif($f['atraso_dosificacion_semanas'] > 0)
                        <span class="badge badge-amber">Dosificación atrasada</span>
                    @endif
                </td>
            </tr>
            @empty
            <tr><td colspan="8">Sin atrasos ni evaluaciones vencidas.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="section-title">Cumplimiento por docente</div>
    <table>
        <thead>
            <tr>
                <th>Docente</th>
                <th>Unidades totales</th>
                <th>Unidades con atraso</th>
                <th>% de cumplimiento</th>
            </tr>
        </thead>
        <tbody>
            @foreach($resumen_docentes as $d)
            <tr>
                <td>{{ $d['docente'] ?? '—' }}</td>
                <td class="num">{{ $d['total_unidades'] }}</td>
                <td class="num">{{ $d['unidades_con_atraso'] }}</td>
                <td class="num">{{ $d['porcentaje_cumplimiento'] }}%</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>

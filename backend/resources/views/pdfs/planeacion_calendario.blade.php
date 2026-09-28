<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Calendario de horas y evaluación</title>
<style>
    body { font-family: Arial, sans-serif; font-size:9pt; color:#1a1a1a; }
    .header { text-align:center; border-bottom:2px solid #1a3a5c; padding-bottom:8px; margin-bottom:12px; }
    .header h1 { font-size:12pt; color:#1a3a5c; margin:0 0 4px; }
    .header p { margin:2px 0; color:#555; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    th { background:#1a3a5c; color:#fff; padding:5px 6px; font-size:8pt; text-align:left; }
    td { padding:4px 6px; border-bottom:1px solid #ddd; font-size:8pt; }
    tr:nth-child(even) td { background:#f0f4f8; }
    .section-title { background:#e8eef5; padding:4px 6px; font-weight:bold; font-size:9pt; margin:10px 0 4px; border-left:4px solid #1a3a5c; }
    .temas { font-size:7pt; color:#555; }
    .badge { display:inline-block; padding:2px 6px; border-radius:4px; font-size:7.5pt; font-weight:bold; color:#fff; }
    .badge-ef { background:#2563eb; }
    .badge-es { background:#b45309; }
    .badge-pendiente { background:#94a3b8; }
    .badge-a_tiempo { background:#16a34a; }
    .badge-adelantado { background:#2563eb; }
    .badge-atraso { background:#dc2626; }
    .num { text-align:right; }
</style>
</head>
<body>
    <div class="header">
        <h1>Calendario de horas y calendarización de evaluación</h1>
        <p>{{ $planeacion->cargaAcademica?->materia?->nombre ?? 'Materia' }}</p>
        <p>Docente: {{ $planeacion->docente?->name }} — Periodo: {{ $planeacion->periodo?->nombre }}</p>
    </div>

    <div class="section-title">Calendarización de evaluación</div>
    <table>
        <thead>
            <tr>
                <th>Unidad</th>
                <th>Última semana de contenido</th>
                <th>Semana de evaluación</th>
                <th>Fechas</th>
                <th>Tipo</th>
            </tr>
        </thead>
        <tbody>
            @foreach($evaluaciones as $ev)
            <tr>
                <td>Unidad {{ $ev['unidad'] }}@if($ev['nombre_unidad']) — {{ $ev['nombre_unidad'] }}@endif</td>
                <td class="num">{{ $ev['ultima_semana_contenido'] ?? '—' }}</td>
                <td class="num">{{ $ev['semana_evaluacion'] ?? '—' }}</td>
                <td>{{ $ev['fechas'] ?? '—' }}</td>
                <td><span class="badge {{ $ev['tipo'] === 'ES' ? 'badge-es' : 'badge-ef' }}">{{ $ev['tipo'] }}</span></td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="section-title">Calendario de horas (resumen semanal)</div>
    <table>
        <thead>
            <tr>
                <th>Semana</th>
                <th>Fechas</th>
                <th>H. Teoría</th>
                <th>H. Práctica</th>
                <th>Temas / subtemas</th>
            </tr>
        </thead>
        <tbody>
            @foreach($semanas as $sem)
            @if($sem['teoria'] > 0 || $sem['practica'] > 0)
            <tr>
                <td class="num">{{ $sem['semana'] }}</td>
                <td>{{ $sem['fechas'] ?? '—' }}</td>
                <td class="num">{{ number_format($sem['teoria'], 1) }}</td>
                <td class="num">{{ number_format($sem['practica'], 1) }}</td>
                <td class="temas">{{ implode(', ', array_unique($sem['temas'])) }}</td>
            </tr>
            @endif
            @endforeach
        </tbody>
    </table>

    <div class="section-title">Dosificación</div>
    <table>
        <thead>
            <tr>
                <th>Unidad</th>
                <th>Subtema</th>
                <th>Sem. inicio</th>
                <th>Sem. fin</th>
                <th>Sem. realizado</th>
                <th>Estatus</th>
            </tr>
        </thead>
        <tbody>
            @forelse($dosificacion as $d)
            <tr>
                <td>Unidad {{ $d['unidad'] }}@if($d['nombre_unidad']) — {{ $d['nombre_unidad'] }}@endif</td>
                <td>{{ $d['subtema'] ?: '—' }}</td>
                <td class="num">{{ $d['semana_inicio'] ?? '—' }}</td>
                <td class="num">{{ $d['semana_fin'] ?? '—' }}</td>
                <td class="num">{{ $d['semana_realizado'] ?? '—' }}</td>
                <td><span class="badge badge-{{ $d['estado'] }}">{{ ['pendiente' => 'Pendiente', 'a_tiempo' => 'A tiempo', 'adelantado' => 'Adelantado', 'atraso' => 'Atraso'][$d['estado']] }}</span></td>
            </tr>
            @empty
            <tr><td colspan="6">Sin subtemas registrados.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>

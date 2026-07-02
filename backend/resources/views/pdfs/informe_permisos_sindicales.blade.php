<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; font-size: 9px; color: #111; }
        h1 { font-size: 12px; text-align: center; margin-bottom: 2px; }
        .subtitle { font-size: 9px; text-align: center; color: #555; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1a3a5c; color: #fff; padding: 5px 6px; font-size: 8px; text-align: left; }
        td { padding: 4px 6px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) td { background: #f5f7fa; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: bold; }
        .con-goce  { background: #dcfce7; color: #166534; }
        .sin-goce  { background: #fee2e2; color: #991b1b; }
        .footer    { margin-top: 16px; font-size: 8px; color: #999; text-align: right; }
    </style>
</head>
<body>
    <h1>INFORME SEMESTRAL DE PERMISOS SINDICALES</h1>
    <p class="subtitle">
        Período: {{ $periodo->nombre }} ({{ \Carbon\Carbon::parse($periodo->fecha_inicio)->format('d/m/Y') }} – {{ \Carbon\Carbon::parse($periodo->fecha_fin)->format('d/m/Y') }})
        &nbsp;|&nbsp; Total: {{ $permisos->count() }} permiso(s)
        &nbsp;|&nbsp; Generado: {{ $fecha }}
    </p>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Docente</th>
                <th>Tipo de permiso</th>
                <th>Fecha inicio</th>
                <th>Fecha fin</th>
                <th>Días</th>
                <th>Goce sueldo</th>
                <th>Grupos afectados</th>
            </tr>
        </thead>
        <tbody>
            @forelse($permisos as $i => $p)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>
                    <strong>{{ $p->docente?->name ?? '—' }}</strong><br>
                    <span style="color:#777">{{ $p->docente?->email ?? '' }}</span>
                </td>
                <td>{{ ucwords(str_replace('_', ' ', $p->tipo_permiso)) }}</td>
                <td>{{ $p->fecha_inicio?->format('d/m/Y') }}</td>
                <td>{{ $p->fecha_fin?->format('d/m/Y') }}</td>
                <td style="text-align:center; font-weight:bold;">{{ $p->dias_totales }}</td>
                <td>
                    <span class="badge {{ $p->con_goce_sueldo ? 'con-goce' : 'sin-goce' }}">
                        {{ $p->con_goce_sueldo ? 'Con goce' : 'Sin goce' }}
                    </span>
                </td>
                <td style="font-size:8px;">{{ $p->grupos_afectados ?: '—' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="8" style="text-align:center; padding:20px; color:#999;">
                    Sin permisos sindicales registrados para este período
                </td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <p class="footer">
        Para la Subdirección Académica &bull; Instituto Tecnológico Superior de la Milpa Alta &bull; TecNM
    </p>
</body>
</html>

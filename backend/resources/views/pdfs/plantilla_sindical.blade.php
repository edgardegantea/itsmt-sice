<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; font-size: 9px; color: #111; }
        h1 { font-size: 13px; text-align: center; margin-bottom: 2px; }
        .subtitle { font-size: 9px; text-align: center; color: #555; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1a3a5c; color: #fff; padding: 5px 6px; font-size: 8px; text-align: left; }
        td { padding: 4px 6px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) td { background: #f5f7fa; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: bold; }
        .base     { background: #dcfce7; color: #166534; }
        .interino { background: #fef9c3; color: #854d0e; }
        .hora     { background: #e0e7ff; color: #3730a3; }
        .medio    { background: #fce7f3; color: #9d174d; }
        .footer   { margin-top: 16px; font-size: 8px; color: #999; text-align: right; }
    </style>
</head>
<body>
    <h1>PLANTILLA DOCENTE SINDICALIZADA — TECNM</h1>
    <p class="subtitle">Generado el {{ $fecha }} &nbsp;|&nbsp; Total de plazas activas: {{ $fichas->count() }}</p>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Docente</th>
                <th>Clave Plaza</th>
                <th>Nombramiento</th>
                <th>Categoría TBC</th>
                <th>Nivel TBC</th>
                <th>N.° ISSSTE</th>
                <th>Ingreso SEP</th>
                <th>Ingreso TecNM</th>
                <th>Años Servicio</th>
                <th>Departamento</th>
            </tr>
        </thead>
        <tbody>
            @forelse($fichas as $i => $f)
            @php
                $badgeClass = match($f->tipo_nombramiento) {
                    'Base'        => 'base',
                    'Interino'    => 'interino',
                    'Hora-Clase'  => 'hora',
                    'Medio-Tiempo'=> 'medio',
                    default       => '',
                };
            @endphp
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>
                    <strong>{{ $f->docente?->name ?? '—' }}</strong><br>
                    <span style="color:#777">{{ $f->docente?->email ?? '' }}</span>
                </td>
                <td>{{ $f->clave_plaza }}</td>
                <td><span class="badge {{ $badgeClass }}">{{ $f->tipo_nombramiento }}</span></td>
                <td>{{ $f->categoria_tbc ?? '—' }}</td>
                <td>{{ $f->nivel_tbc ?? '—' }}</td>
                <td>{{ $f->numero_issste ?? '—' }}</td>
                <td>{{ $f->fecha_ingreso_sep?->format('d/m/Y') ?? '—' }}</td>
                <td>{{ $f->fecha_ingreso_tecnm?->format('d/m/Y') ?? '—' }}</td>
                <td style="text-align:center; font-weight:bold;">{{ $f->anios_servicio }}</td>
                <td>{{ $f->departamento?->nombre ?? '—' }}</td>
            </tr>
            @empty
            <tr><td colspan="11" style="text-align:center; padding:20px; color:#999;">Sin plazas activas registradas</td></tr>
            @endforelse
        </tbody>
    </table>

    <p class="footer">
        Reporte generado por SICE &bull; Instituto Tecnológico de la Milpa Alta &bull; TecNM
    </p>
</body>
</html>

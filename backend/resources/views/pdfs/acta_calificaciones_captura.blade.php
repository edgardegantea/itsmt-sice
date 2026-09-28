<?php
    $cfg = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();
    $logoB64 = $cfg->logoBase64();
    $carrera = $grupo->carrera;
    $materia = $carga->materia;
    $docente = $carga->docente;
    $fechaHoy = \Carbon\Carbon::now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
    $OPORTUNIDAD = ['primera_oportunidad' => '1a', 'segunda_oportunidad' => '2a'];
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Acta de calificaciones</title>
<style>
    body { font-family: Arial, sans-serif; font-size: 8.5pt; color: #1a1a1a; margin-bottom: 100px; }
    .header { padding-bottom: 8px; margin-bottom: 4px; }
    .header table { width: 100%; }
    .header-logo { width: 60px; }
    .header-logo img { max-width: 54px; max-height: 46px; }
    .header-center h1 { font-size: 12pt; color: #1a3a5c; margin: 0; }
    .header-center p { font-size: 8pt; color: #555; margin: 2px 0 0; }
    .header-right { text-align: right; font-size: 8pt; color: #777; }

    .folio-linea { font-size: 7.5pt; color: #777; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
    .folio-linea strong { color: #1a3a5c; }
    .badge-firmada { color: #15803d; font-weight: bold; }
    .badge-pendiente { color: #b45309; font-weight: bold; }

    table.datos { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8.5pt; }
    table.datos td { padding: 3px 6px; border: 1px solid #ddd; }
    table.datos td.label { font-weight: bold; background: #f0f4f8; width: 16%; }

    table.alumnos { width: 100%; border-collapse: collapse; font-size: 8pt; }
    table.alumnos th { background: #f0f4f8; color: #1a3a5c; border-bottom: 2px solid #d5deea; padding: 5px 6px; text-align: center; }
    table.alumnos td { padding: 4px 6px; border-bottom: 1px solid #e0e0e0; text-align: center; }
    table.alumnos td.nombre { text-align: left; }
    table.alumnos tr:nth-child(even) td { background: #f7f9fb; }

    .resumen { margin-top: 10px; font-size: 8pt; color: #555; }
    table.stats { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 7.5pt; }
    table.stats td { padding: 3px 6px; border: 1px solid #e5e5e5; text-align: center; }
    table.stats td.label { background: #f7f9fb; font-weight: bold; color: #555; }

    /* Marca de agua "BORRADOR" mientras falten calificaciones finales por capturar —
       para que no se confunda con un acta ya completa/definitiva. */
    .marca-agua {
        position: fixed; top: 40%; left: 8%; width: 84%;
        font-size: 64pt; font-weight: bold; color: #1a3a5c; opacity: 0.08;
        transform: rotate(-30deg); text-align: center; z-index: -1;
    }

    /* Pie de página fijo — DomPDF repite los elementos "position: fixed" en cada
       hoja, así las firmas quedan siempre al pie sin importar cuántas páginas
       ocupe la lista de alumnos. */
    .pie-pagina { position: fixed; bottom: 0; left: 0; right: 0; }

    .firmas { width: 100%; margin-top: 0; }
    .firmas td { width: 50%; text-align: center; font-size: 8.5pt; padding-top: 26px; border-top: 1px solid #333; }
    .firmas .titulo { font-weight: bold; color: #1a3a5c; text-transform: uppercase; }
    .firmas .nombre { font-size: 7.5pt; color: #555; margin-top: 2px; }

    .pie { margin-top: 8px; font-size: 7pt; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 6px; }
</style>
</head>
<body>

    @if($borrador)
    <div class="marca-agua">BORRADOR</div>
    @endif

    <div class="pie-pagina">
        <table class="firmas">
            <tr>
                <td class="titulo">
                    Docente
                    <div class="nombre">{{ $docente?->name ?? '_____________________' }}</div>
                </td>
                <td class="titulo">
                    Representante de Control Escolar
                    @if($acta->firmado_en)
                        <div class="nombre">{{ $acta->firmadoPor?->name ?? '—' }}</div>
                        <div style="font-size:7pt;color:#555;">Firmado electrónicamente: {{ $acta->firmado_en->format('d/m/Y H:i') }}</div>
                    @else
                        <div class="nombre">_____________________</div>
                    @endif
                </td>
            </tr>
        </table>
        <div class="pie">Este documento es un comprobante de las calificaciones capturadas a la fecha de emisión — no sustituye el acta oficial de Cierre de Curso.</div>
    </div>

    <div class="header">
        <table>
            <tr>
                <td class="header-logo">
                    @if($logoB64)<img src="{{ $logoB64 }}" alt="logo">@endif
                </td>
                <td class="header-center">
                    <h1>Acta de Calificaciones</h1>
                    <p>{{ $cfg->nombre_institucion ?? 'Tecnológico Nacional de México' }}</p>
                </td>
                <td class="header-right">
                    Grupo: {{ $grupo->clave }}<br>
                    Fecha de emisión: {{ $fechaHoy }}
                </td>
            </tr>
        </table>
    </div>

    <div class="folio-linea">
        Folio: <strong>{{ $acta->folio }}</strong> &nbsp;|&nbsp;
        Generada por {{ $acta->generadoPor?->name ?? '—' }} el {{ $acta->generado_en?->format('d/m/Y H:i') }}
        &nbsp;|&nbsp;
        @if($acta->firmado_en)
            <span class="badge-firmada">✓ Firmada por Control Escolar</span>
        @else
            <span class="badge-pendiente">Pendiente de firma de Control Escolar</span>
        @endif
    </div>

    <table class="datos">
        <tr>
            <td class="label">Carrera</td><td>{{ $carrera?->nombre ?? '—' }}</td>
            <td class="label">Periodo</td><td>{{ $grupo->periodo?->nombre ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Asignatura</td><td>{{ $materia?->nombre ?? '—' }}</td>
            <td class="label">Clave</td><td>{{ $materia?->clave ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Docente</td><td>{{ $docente?->name ?? '—' }}</td>
            <td class="label">Grupo</td><td>{{ $grupo->clave }}</td>
        </tr>
    </table>

    <table class="alumnos">
        <thead>
            <tr>
                <th style="width:26px;">#</th>
                <th style="width:100px;">No. Control</th>
                <th style="text-align:left;">Alumno</th>
                <th style="width:60px;">Final</th>
                <th style="width:50px;">Oport.</th>
                <th style="width:90px;">Estatus</th>
            </tr>
        </thead>
        <tbody>
            @foreach($alumnos as $i => $alumno)
            @php
                $cal = $calificaciones->get($alumno->id);
            @endphp
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $alumno->numero_control }}</td>
                <td class="nombre">{{ $alumno->user?->name ?? '—' }}</td>
                <td style="font-weight:bold;">{{ $cal?->calificacion_final ?? '—' }}</td>
                <td>{{ $OPORTUNIDAD[$cal?->oportunidad] ?? '—' }}</td>
                <td style="color:{{ $cal?->calificacion_final === null ? '#999' : ($cal->acreditado ? 'green' : 'red') }};">
                    {{ $cal?->calificacion_final === null ? '—' : ($cal->acreditado ? 'APROBADO' : 'NO APROBADO') }}
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="resumen">
        Total de alumnos: <strong>{{ $stats['total_alumnos'] }}</strong> &nbsp;|&nbsp;
        Con calificación final: <strong>{{ $stats['con_final'] }}</strong> &nbsp;|&nbsp;
        Aprobados: <strong style="color:green;">{{ $stats['aprobados'] }}</strong> &nbsp;|&nbsp;
        No aprobados: <strong style="color:red;">{{ $stats['no_aprobados'] }}</strong>
        @if($stats['promedio_grupal'] !== null)
        &nbsp;|&nbsp; Promedio grupal: <strong>{{ $stats['promedio_grupal'] }}</strong>
        &nbsp;|&nbsp; Máxima: <strong>{{ $stats['maxima'] }}</strong>
        &nbsp;|&nbsp; Mínima: <strong>{{ $stats['minima'] }}</strong>
        @endif
    </div>

    @if($stats['con_final'] > 0)
    <table class="stats">
        <tr>
            @foreach($stats['distribucion'] as $rango => $cantidad)
            <td class="label">{{ $rango }}</td>
            @endforeach
        </tr>
        <tr>
            @foreach($stats['distribucion'] as $cantidad)
            <td>{{ $cantidad }}</td>
            @endforeach
        </tr>
    </table>
    @endif

</body>
</html>

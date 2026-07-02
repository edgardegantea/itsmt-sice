<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 10pt; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #003366; padding-bottom: 10px; margin-bottom: 16px; }
        .header h1 { font-size: 13pt; color: #003366; margin: 4px 0; }
        .header h2 { font-size: 11pt; color: #555; margin: 2px 0; }
        .aviso { background: #fff3cd; border: 1px solid #ffc107; padding: 8px 12px; font-size: 9pt; margin-bottom: 14px; }
        .datos { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .datos td { padding: 4px 8px; vertical-align: top; }
        .datos .label { font-weight: bold; color: #444; width: 160px; }
        table.materias { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.materias th { background: #003366; color: #fff; padding: 5px 8px; font-size: 9pt; text-align: left; }
        table.materias td { border: 1px solid #ccc; padding: 4px 8px; font-size: 9pt; }
        table.materias tr:nth-child(even) td { background: #f5f7fa; }
        .firma { margin-top: 50px; text-align: center; }
        .firma-linea { border-top: 1px solid #000; display: inline-block; min-width: 220px; padding-top: 4px; margin: 0 30px; }
        .pie { font-size: 8pt; color: #888; margin-top: 20px; text-align: center; }
    </style>
</head>
<body>

<div class="header">
    <h1>INSTITUTO TECNOLÓGICO SUPERIOR DE MARTÍNEZ DE LA TORRE</h1>
    <h2>KARDEX DE TRASLADO — CONSTANCIA DE CALIFICACIONES</h2>
    <p style="font-size:9pt; color:#888; margin:2px 0;">Fecha de emisión: {{ $fecha }}</p>
</div>

{{-- Cap. 6 TecNM: solo kardex o constancia de calificaciones, NUNCA certificado incompleto --}}
<div class="aviso">
    <strong>Nota TecNM Cap. 6:</strong> Este documento es un <strong>Kardex / Constancia de Calificaciones</strong>.
    No constituye Certificado de Estudios ni acredita la conclusión parcial del plan de estudios.
</div>

<table class="datos">
    <tr>
        <td class="label">Alumno:</td>
        <td>{{ $traslado->alumno->name ?? '—' }}</td>
        <td class="label">Tipo de traslado:</td>
        <td>{{ ucfirst($traslado->tipo) }}</td>
    </tr>
    <tr>
        <td class="label">Instituto origen:</td>
        <td>{{ $traslado->instituto_origen ?? '—' }}</td>
        <td class="label">Instituto destino:</td>
        <td>{{ $traslado->instituto_destino ?? '—' }}</td>
    </tr>
    <tr>
        <td class="label">Carrera:</td>
        <td>{{ $alumno?->carrera?->nombre ?? '—' }}</td>
        <td class="label">Estatus traslado:</td>
        <td>{{ ucfirst($traslado->estatus) }}</td>
    </tr>
</table>

<h3 style="color:#003366; font-size:10pt; margin-bottom:6px;">Historial de Calificaciones</h3>

@php
    $grupos = $alumno?->grupos ?? collect();
    $filas  = [];
    foreach ($grupos as $grupo) {
        $periodo = $grupo->periodo?->nombre ?? '—';
        foreach ($grupo->cargas as $carga) {
            $cal = $carga->calificaciones->first();
            $filas[] = [
                'periodo'  => $periodo,
                'clave'    => $carga->materia?->clave ?? '—',
                'materia'  => $carga->materia?->nombre ?? '—',
                'creditos' => $carga->materia?->creditos ?? '—',
                'calificacion' => $cal?->calificacion_final ?? '—',
                'estatus'  => $cal ? ($cal->aprobado ? 'Aprobada' : 'Reprobada') : 'Sin calificación',
            ];
        }
    }
@endphp

@if(count($filas) > 0)
<table class="materias">
    <thead>
        <tr>
            <th>Periodo</th>
            <th>Clave</th>
            <th>Materia</th>
            <th style="text-align:center;">Créditos</th>
            <th style="text-align:center;">Calificación</th>
            <th>Estatus</th>
        </tr>
    </thead>
    <tbody>
        @foreach($filas as $fila)
        <tr>
            <td>{{ $fila['periodo'] }}</td>
            <td>{{ $fila['clave'] }}</td>
            <td>{{ $fila['materia'] }}</td>
            <td style="text-align:center;">{{ $fila['creditos'] }}</td>
            <td style="text-align:center;">{{ $fila['calificacion'] }}</td>
            <td>{{ $fila['estatus'] }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@else
<p style="color:#888; font-style:italic;">Sin materias cursadas registradas en el sistema.</p>
@endif

<div class="firma">
    <span class="firma-linea">Director(a) General</span>
    <span class="firma-linea">Control Escolar</span>
</div>

<div class="pie">
    Documento generado por SICE-ITSMT — {{ $fecha }} &nbsp;|&nbsp;
    Válido solo con sello institucional original.
</div>

</body>
</html>

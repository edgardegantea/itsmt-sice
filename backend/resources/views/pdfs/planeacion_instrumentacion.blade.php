<?php
    // Réplica del formato del SGC "Instrumentación Didáctica para la formación y desarrollo de
    // competencias profesionales-Ingreso Agosto 2015 del SGI del G4": carta horizontal, Arial
    // 12/11 pt, márgenes 2.5 cm (izq./sup.) y 2 cm (der./inf.), encabezado en cada página.
    // Pasa por revisión del SGC: textos, numeración (1), (4.1)… y disposición deben coincidir
    // con el original. Los datos llegan de PlaneacionDocenteController::datosInstrumentacion().
    // $motor: 'chromium' (Gotenberg, encabezado como header.html y márgenes por parámetro)
    // o 'dompdf' (respaldo, encabezado como bloque fijo y márgenes con @page).
    $motor ??= 'dompdf';

    // HTML del editor enriquecido, sanitizado (el array `competencias` no tiene validación
    // de esquema; sin esto se podría inyectar HTML/CSS arbitrario en el PDF).
    $html = fn ($v) => \App\Support\RichText::aHtmlSeguro($v);
    $semanas = count($d['tp']);
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Instrumentación Didáctica</title>
<style>
    @if($motor === 'dompdf') @page { margin: 106pt 57pt 57pt 71pt; } @endif
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #000; line-height: 1.15; }
    p { margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    .t td, .t th { border: 0.6pt solid #000; padding: 2pt 4pt; vertical-align: top; font-size: 11pt; font-weight: normal; }
    .t th { text-align: center; vertical-align: middle; }
    .c { text-align: center; vertical-align: middle; }
    .b { font-weight: bold; }
    .titulo-sec { font-weight: bold; margin: 12pt 0 3pt; }
    .etiqueta { margin: 12pt 0 3pt 6pt; }
    .caja { border: 0.6pt solid #000; min-height: 62pt; padding: 4pt 6pt; }
    .campo { border-bottom: 0.6pt solid #000; display: inline-block; }
    .salto { page-break-before: always; }
    .rico p { margin: 0 0 3pt; }
    .rico ul, .rico ol { margin: 0 0 3pt 14pt; padding: 0; }
    /* Las filas con actividades largas se parten entre páginas, igual que en Word. */
    tr { page-break-inside: auto; }
    thead { display: table-header-group; }

    /* Encabezado del formato, repetido en cada página (distancia del encabezado: 1 cm) */
    #encabezado { position: fixed; top: -78pt; left: 0; right: 0; }

    .semanas td, .semanas th { font-size: 11pt; padding: 1pt 1pt; }
    .leyenda td { font-size: 11pt; text-align: center; padding: 1pt 0; }
    .firmas td { text-align: center; vertical-align: bottom; font-size: 12pt; }
</style>
</head>
<body>

@if($motor === 'dompdf')
<div id="encabezado">
    @include('pdfs.partials.instrumentacion_encabezado', ['logoTec' => $d['logo_tec'], 'logoInst' => $d['logo_inst']])
</div>
@endif

{{-- Título, periodo y datos de la asignatura --}}
<p class="b" style="text-align:center; margin-top:30pt;">Instrumentación didáctica para la formación y desarrollo de competencias profesionales</p>
<p class="b" style="text-align:center;">Periodo <span class="campo" style="min-width:130pt; font-weight:normal;">{{ $d['periodo'] }}</span></p>

<table style="width:auto; margin:30pt 0 0 132pt; font-size:12pt;">
    <tr><td style="padding:0 4pt 0 0;">Nombre de la asignatura:</td><td style="padding:0;"><span class="campo" style="width:260pt;">{{ $d['asignatura'] }}</span></td></tr>
    <tr><td style="padding:0 4pt 0 0;">Plan de estudios:</td><td style="padding:0;"><span class="campo" style="width:260pt;">{{ $d['plan'] }}</span></td></tr>
    <tr><td style="padding:0 4pt 0 0;">Clave de la asignatura:</td><td style="padding:0;"><span class="campo" style="width:260pt;">{{ $d['clave'] }}</span></td></tr>
    <tr><td style="padding:0 4pt 0 0;">Horas teoría-Horas práctica-Créditos:</td><td style="padding:0;"><span class="campo" style="width:260pt;">{{ $d['horas'] }}</span></td></tr>
</table>

<p class="titulo-sec" style="margin-top:3pt;">1. Caracterización de la asignatura&nbsp; (1)</p>
<div class="caja rico">{!! $html($d['caracterizacion']) !!}</div>

<p class="titulo-sec">2. Intención didáctica&nbsp; (2)</p>
<div class="caja rico">{!! $html($d['intencion']) !!}</div>

<p class="titulo-sec">3. Competencia de la asignatura&nbsp; (3)</p>
<div class="caja rico">{!! $html($d['competencia']) !!}</div>

{{-- 4. Análisis por competencias específicas: se repite por cada competencia --}}
@foreach($d['competencias'] as $comp)
    @php
        $letras = $comp['letras'] ?: ['A', 'B', 'C', '…', 'N'];
        $filas = $comp['filas'] ?: [['subtemas' => [], 'aprendizaje' => '', 'ensenanza' => '', 'horas' => '']];
    @endphp
    <p class="titulo-sec salto">4. Análisis por competencias especificas</p>
    <table style="margin-bottom:10pt;">
        <tr>
            <td style="width:48%; vertical-align:top; padding:0 12pt 0 6pt;">
                Competencia No. (4.1) <span class="campo" style="width:170pt; text-align:center;">{{ $comp['numero'] }}</span>
            </td>
            <td style="vertical-align:top; padding:0;">
                Descripción: (4.2)
                <div class="campo rico" style="display:block; margin-top:2pt;">
                    @if($comp['nombre'] !== '')<strong>{{ $comp['nombre'] }}.</strong> @endif{!! $html($comp['descripcion']) !!}
                </div>
            </td>
        </tr>
    </table>

    <table class="t">
        <thead>
            <tr>
                <th style="width:24%;">Temas y Subtemas para desarrollar la competencia especifica (4.3)</th>
                <th style="width:20%;">Actividades de aprendizaje (4.4)</th>
                <th style="width:20%;">Actividades de enseñanza (4.5)</th>
                <th style="width:20%;">Desarrollo de competencias genéricas (4.6)</th>
                <th style="width:16%;">Horas teórico-prácticas (4.7)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($filas as $f)
            <tr>
                <td>@foreach($f['subtemas'] as $s){{ $s }}@if(!$loop->last)<br>@endif @endforeach</td>
                <td class="rico">{!! $html($f['aprendizaje']) !!}</td>
                <td class="rico">{!! $html($f['ensenanza']) !!}</td>
                <td>@if($loop->first)@foreach($comp['genericas'] as $g){{ $g }}@if(!$loop->last)<br>@endif @endforeach @endif</td>
                <td class="c">{{ $f['horas'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <table class="t" style="margin-top:14pt;">
        <tr>
            <td style="width:55%; font-size:12pt;">Indicadores de alcance&nbsp; (4.8)</td>
            <td style="font-size:12pt;">Valor del indicador&nbsp; (4.9)</td>
        </tr>
        <tr>
            <td style="font-size:10pt;">
                @forelse($comp['indicadores'] as $ind){{ $ind['letra'] }}. {{ $ind['indicador'] }}@if(!$loop->last)<br>@endif
                @empty A.<br>B.<br>C.<br>…<br>N.
                @endforelse
            </td>
            <td style="font-size:10pt;">
                @foreach($comp['indicadores'] as $ind){{ $ind['letra'] }}. {{ $ind['valor'] }}@if(!$loop->last)<br>@endif @endforeach
            </td>
        </tr>
    </table>

    <p class="etiqueta">Niveles de desempeño&nbsp; (4.10)</p>
    <table class="t">
        <tr>
            <th style="width:22%; font-size:12pt;">Desempeño</th>
            <th style="width:20%; font-size:12pt;">Nivel de desempeño</th>
            <th style="font-size:12pt;">Indicadores de alcance</th>
            <th style="width:20%; font-size:12pt;">Valoración numérica</th>
        </tr>
        @foreach($comp['niveles'] as $niv)
        <tr>
            @if($loop->first)
                <td class="c" rowspan="4" style="font-size:12pt;">Competencia alcanzada</td>
            @elseif($niv['nivel'] === 'Insuficiente')
                <td class="c" style="font-size:12pt;">Competencia no alcanzada</td>
            @endif
            <td style="font-size:12pt;">{{ $niv['nivel'] }}</td>
            <td>{{ $niv['indicadores'] }}</td>
            <td class="c">{{ $niv['valoracion'] }}</td>
        </tr>
        @endforeach
    </table>

    <p class="etiqueta">Matriz de evaluación&nbsp; (4.11)</p>
    <table class="t">
        <tr>
            <th rowspan="2" style="width:26%; font-size:12pt;">Evidencia de aprendizaje</th>
            <th rowspan="2" style="width:12%; font-size:12pt;">%</th>
            <th colspan="{{ count($letras) }}" style="font-size:12pt;">Indicador de alcance</th>
            <th rowspan="2" style="font-size:12pt;">Evaluación formativa de la competencia</th>
        </tr>
        <tr>@foreach($letras as $l)<th style="width:3.8%; font-size:12pt;">{{ $l }}</th>@endforeach</tr>
        @forelse($comp['matriz'] as $f)
        <tr>
            <td>{{ $f['evidencia'] }}</td>
            <td class="c">{{ $f['porcentaje'] }}</td>
            @foreach($letras as $k => $l)<td class="c">{{ !empty($f['marcas'][$k]) ? 'X' : '' }}</td>@endforeach
            <td>{{ $f['formativa'] }}</td>
        </tr>
        @empty
        <tr><td>&nbsp;</td><td></td>@foreach($letras as $l)<td></td>@endforeach<td></td></tr>
        <tr><td>&nbsp;</td><td></td>@foreach($letras as $l)<td></td>@endforeach<td></td></tr>
        @endforelse
        <tr>
            <td></td>
            <td class="c" style="font-size:12pt;">Total @if($comp['matriz']){{ rtrim(rtrim(number_format($comp['total_pct'], 2, '.', ''), '0'), '.') }}@endif</td>
            @if($comp['indicadores'])
                @foreach($comp['indicadores'] as $ind)<td class="c">{{ $ind['valor'] }}</td>@endforeach
            @else
                @foreach($letras as $l)<td></td>@endforeach
            @endif
            <td></td>
        </tr>
    </table>
    <p style="font-size:11.5pt; margin-top:10pt;"><strong>Nota:</strong> este apartado número 4 de la instrumentación didáctica para la formación y desarrollo de competencias profesionales se repite, de acuerdo al número de competencias específicas de los temas de asignatura.</p>
@endforeach

{{-- 5. Fuentes de información y apoyos didácticos --}}
<p class="titulo-sec" style="margin-top:28pt;">5. Fuentes de información y apoyos didácticos</p>
<table style="margin-top:22pt;">
    <tr>
        <td style="width:50%; padding:0 0 3pt 0;">Fuentes de información: (5.1)</td>
        <td style="padding:0 0 3pt 0;">Apoyos didácticos: (5.2)</td>
    </tr>
</table>
<table class="t">
    <tr>
        <td style="width:50%; height:90pt;">@foreach($d['fuentes'] as $f){{ $loop->iteration }}. {{ $f }}@if(!$loop->last)<br>@endif @endforeach</td>
        <td>@foreach($d['apoyos'] as $a){{ $a }}@if(!$loop->last)<br>@endif @endforeach</td>
    </tr>
</table>

{{-- 6. Calendarización de evaluación en semanas --}}
<p class="titulo-sec" style="margin-top:22pt;">6. Calendarización de evaluación en semanas: (6)</p>
<table class="t semanas" style="table-layout:fixed;">
    <tr>
        <td class="c" style="width:8%;">Semana</td>
        @foreach(array_keys($d['tp']) as $s)
            @if($s === $semanas)
                <td class="c" style="width:7%;">{{ $s }}<br><span style="font-size:8pt;">Segunda oportunidad</span></td>
            @else
                <td class="c">{{ $s }}</td>
            @endif
        @endforeach
    </tr>
    @foreach(['TP' => $d['tp'], 'TR' => [], 'SD' => []] as $fila => $valores)
    <tr>
        <td class="c">{{ $fila }}</td>
        @foreach(array_keys($d['tp']) as $s)<td class="c" style="font-size:9pt;">{{ $valores[$s] ?? '' }}</td>@endforeach
    </tr>
    @endforeach
</table>
<table class="leyenda" style="margin-top:14pt;">
    <tr><td style="width:33%;">TP= tiempo planeado</td><td style="width:34%;">TR = tiempo real</td><td>SD = seguimiento departamental</td></tr>
    <tr><td>ED = Evaluación Diagnóstica</td><td>EFn = Evaluación Formativa (competencia especifica n)</td><td>ES = Evaluación Sumativa</td></tr>
</table>

<p style="text-align:right; margin-top:40pt;">Fecha de elaboración: <span class="campo" style="width:120pt; text-align:center;">{{ $d['fecha'] }}</span></p>

{{-- Firmas --}}
<table class="firmas" style="margin-top:70pt; page-break-inside:avoid;">
    <tr>
        <td style="width:38%; border-bottom:0.6pt solid #000; height:16pt;">{{ $d['docente'] }}</td>
        <td style="width:6%;"></td>
        <td style="border-bottom:0.6pt solid #000;">{{ $d['jefe'] }}</td>
    </tr>
    <tr>
        <td style="padding-top:2pt;">Nombre y firma del(de la) profesor(a)</td>
        <td></td>
        <td style="padding-top:2pt;">Nombre y firma del(de la) Jefe(a) de Departamento Académico</td>
    </tr>
</table>

</body>
</html>

<?php
    $cfg = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();
    $logoB64 = $cfg->logoBase64();
    $materia = $planeacion->cargaAcademica?->materia;
    $carrera = $planeacion->cargaAcademica?->grupos?->first()?->carrera;

    $rangoValoracion = [
        'Excelente'   => '95-100',
        'Notable'     => '85-94',
        'Bueno'       => '75-84',
        'Suficiente'  => '70-74',
        'Insuficiente' => 'NA (no alcanzada)',
    ];
    $desempenoGrupo = fn ($nivel) => $nivel === 'Insuficiente' ? 'Competencia no alcanzada' : 'Competencia alcanzada';

    // Algunos registros antiguos guardaron estos campos como texto libre en vez de array
    // (el editor los migró después a listas) — se normalizan aquí para que implode() no truene.
    $listar = function ($v) {
        if (empty($v)) return '—';
        return implode(', ', is_array($v) ? $v : [$v]);
    };
    // Los campos de texto libre guardan el HTML del editor enriquecido del frontend
    // (RichTextField: negrita, cursiva, listas, alineación) — dompdf sí interpreta HTML/CSS
    // real (a diferencia de PhpWord::addText(), usado en el export a Word), así que aquí se
    // pinta ese HTML ya sanitizado con {!! !!} en vez de aplanarlo a texto plano, y sí se
    // conserva el formato que aplicó el docente. aHtmlSeguro() es la única defensa real
    // contra HTML malicioso: el array `competencias` no tiene validación de esquema en el
    // backend, así que sin esto cualquiera con acceso a la API podría inyectar HTML/CSS
    // arbitrario directamente en el PDF.
    $html = fn ($v) => \App\Support\RichText::aHtmlSeguro($v);
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Instrumentación Didáctica</title>
<style>
    body { font-family: Arial, sans-serif; font-size: 8.5pt; color: #1a1a1a; }
    table { width: 100%; border-collapse: collapse; }

    .doc-header table { border: 1px solid #000; margin-bottom: 14px; }
    .doc-header td { border: 1px solid #000; padding: 4px 8px; vertical-align: middle; }
    .doc-header .logo-cell { width: 90px; text-align: center; }
    .doc-header .logo-cell img { max-width: 78px; max-height: 60px; }
    .doc-header .titulo-cell { font-weight: bold; font-size: 9.5pt; }
    .doc-header .meta-cell { font-size: 8pt; font-weight: bold; white-space: nowrap; width: 150px; }
    .doc-header .norma-cell { font-size: 8pt; }

    .portada { text-align: center; margin-bottom: 14px; }
    .portada h1 { font-size: 10.5pt; font-weight: bold; margin: 2px 0; }
    .portada p { font-size: 9pt; margin: 2px 0; }

    .datos-generales { margin-bottom: 14px; font-size: 9pt; }
    .datos-generales td { padding: 2px 0; }
    .datos-generales .label { font-weight: bold; width: 190px; }

    .seccion-titulo { font-weight: bold; font-size: 9.5pt; margin: 14px 0 4px; }
    /* Sin white-space:pre-wrap ni text-align forzado aquí: el contenido ahora es el HTML real
       del editor enriquecido (RichText::aHtmlSeguro), no texto plano — cada párrafo trae su
       propio <div>/<p>, y su propia alineación si el docente la marcó (vía style="text-align:
       ..." en ese elemento). Forzar "justify" a nivel de .caja rompía la alineación individual
       que el docente sí eligió, y forzarlo con texto plano de saltos "\n" (el enfoque anterior)
       estiraba cada línea corta con espacios enormes — un párrafo real envuelto por dompdf no
       tiene ese problema, justifica igual que en un navegador. */
    .caja { border: 1px solid #000; min-height: 46px; padding: 6px 8px; margin-bottom: 10px; text-align: left; }
    .caja div, .caja p { margin: 0 0 6px; }
    .caja div:last-child, .caja p:last-child { margin-bottom: 0; }
    .caja ul, .caja ol { margin: 2px 0 6px; padding-left: 16px; }

    table.datos-tabla, table.analisis, table.indicadores, table.niveles, table.matriz, table.evaluaciones, table.fuentes-apoyo, table.practicas {
        border: 1px solid #000; margin-bottom: 10px;
    }
    table.datos-tabla td, table.datos-tabla th,
    table.analisis td, table.analisis th,
    table.indicadores td, table.indicadores th,
    table.niveles td, table.niveles th,
    table.matriz td, table.matriz th,
    table.evaluaciones td, table.evaluaciones th,
    table.fuentes-apoyo td, table.fuentes-apoyo th,
    table.practicas td, table.practicas th {
        border: 1px solid #000; padding: 3px 5px; vertical-align: top; font-size: 8pt;
    }
    table thead th { background: #e8eef5; font-weight: bold; text-align: center; }

    .unidad-header { background: #1a3a5c; color: #fff; font-weight: bold; font-size: 9pt; padding: 5px 8px; margin: 16px 0 8px; }
    .unidad-header.pagebreak { page-break-before: always; }
    .sub-titulo { font-weight: bold; font-size: 8.5pt; margin: 8px 0 3px; }
    .num { text-align: center; }
    .lista { margin: 0; padding-left: 14px; }
    .lista li { margin-bottom: 2px; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 7.5pt; font-weight: bold; color: #fff; background: #2563eb; }
    .badge-es { background: #b45309; }
    .firmas-row { margin-top: 40px; width: 100%; }
    .firmas-row td.firmas { text-align: center; font-size: 8.5pt; padding: 40px 20px 0; border: none; }
    .fecha-elab { text-align: right; margin: 20px 0 10px; font-size: 9pt; }
</style>
</head>
<body>

    <div class="doc-header">
    <table>
        <tr>
            <td class="logo-cell" rowspan="2">
                @if($logoB64)<img src="{{ $logoB64 }}" alt="">@endif
            </td>
            <td class="titulo-cell" style="width:60%;">
                Instrumentación Didáctica para la formación y desarrollo de competencias profesionales
            </td>
            <td class="meta-cell">Código: TecNM-AC-PO-003-02</td>
        </tr>
        <tr>
            <td class="norma-cell">Referencia a la Norma ISO 9001:2015: 8.1, 8.2.2, 8.5.1</td>
            <td class="meta-cell">Revisión: O</td>
        </tr>
    </table>
    </div>

    <div class="portada">
        <h1>Tecnológico Nacional de México</h1>
        <p>{{ mb_strtoupper($cfg->nombre_institucion ?? '') }}</p>
        <p>Subdirección Académica</p>
        <!-- <p>Subdirección Académica o su equivalente en los Institutos Tecnológicos Descentralizados</p> -->
        <p>Instrumentación didáctica para la formación y desarrollo de competencias Profesionales</p>
        <p><strong>Periodo:</strong> {{ $planeacion->periodo?->nombre ?? '—' }}</p>
    </div>

    <table class="datos-generales">
        <tr><td class="label">Nombre de la asignatura:</td><td>{{ $materia?->nombre ?? '—' }}</td></tr>
        <tr><td class="label">Plan de estudios:</td><td>{{ $carrera?->nombre ?? '—' }}</td></tr>
        <tr><td class="label">Clave de la asignatura:</td><td>{{ $materia?->clave ?? '—' }}</td></tr>
        <tr><td class="label">Horas teoría-Horas prácticas-Créditos:</td><td>{{ $materia?->horas_teoria ?? '—' }}-{{ $materia?->horas_practica ?? '—' }}-{{ $materia?->creditos ?? '—' }}</td></tr>
        <tr><td class="label">Docente:</td><td>{{ $planeacion->docente?->name ? mb_strtoupper($planeacion->docente->name) : '—' }}</td></tr>
    </table>

    <div class="seccion-titulo">1. Caracterización de la asignatura</div>
    <div class="caja">{!! $html($planeacion->caracterizacion) ?: '—' !!}</div>

    <div class="seccion-titulo">2. Intención Didáctica</div>
    <div class="caja">{!! $html($planeacion->intencion_didactica) ?: '—' !!}</div>

    <div class="seccion-titulo">3. Competencia de la asignatura</div>
    <div class="caja">{!! $html($planeacion->competencia_asignatura) ?: '—' !!}</div>

    @foreach($competencias as $comp)
    @php
        $actividadesPorFila = collect($comp['actividades'] ?? [])->keyBy('numero');
        $subtemasPorFila = collect($comp['subtemas'] ?? [])->groupBy('fila');
        $letras = collect($comp['indicadores_alcance'] ?? [])->pluck('letra')->filter()->values();
    @endphp
    <div class="unidad-header {{ !$loop->first ? 'pagebreak' : '' }}">
        {{ !empty($comp['nombre_unidad']) ? $comp['nombre_unidad'] : 'Tema '.($comp['numero'] ?? ($loop->index + 1)) }}
        @if(($comp['porcentaje'] ?? null) !== null) ({{ $comp['porcentaje'] }}% de la calificación) @endif
    </div>

    <div class="sub-titulo">3. Análisis por competencias específicas</div>
    <div style="margin-bottom:6px;">
        <strong>Competencia No.:</strong> {{ $comp['numero'] ?? ($loop->index + 1) }} (número de temas: {{ count($comp['subtemas'] ?? []) }})
        &nbsp;&nbsp; <strong>Descripción:</strong> {!! $html($comp['descripcion'] ?? null) ?: '—' !!}
    </div>

    <table class="analisis">
        <thead>
            <tr>
                <th style="width:22%;">Temas y subtemas para desarrollar la competencia específica</th>
                <th style="width:20%;">Actividades de aprendizaje</th>
                <th style="width:20%;">Actividades de enseñanza</th>
                <th style="width:20%;">Desarrollo de competencias genéricas</th>
                <th style="width:18%;">Horas teórico-práctica</th>
            </tr>
        </thead>
        <tbody>
            @forelse(($comp['actividades'] ?? []) as $act)
            <tr>
                <td>
                    @php $subs = $subtemasPorFila->get($act['numero']) ?? collect(); @endphp
                    @if($subs->isEmpty()) — @else
                    <ul class="lista">
                        @foreach($subs as $s) <li>{{ $s['texto'] }}</li> @endforeach
                    </ul>
                    @endif
                </td>
                <td>{!! $html($act['actividad_aprendizaje'] ?? null) ?: '—' !!}</td>
                <td>{!! $html($act['actividad_ensenanza'] ?? null) ?: '—' !!}</td>
                <td>{{ $listar($comp['competencias_genericas'] ?? null) }}</td>
                <td class="num">T: {{ $act['horas_teoricas'] ?? 0 }} / P: {{ $act['horas_practicas'] ?? 0 }}</td>
            </tr>
            @empty
            <tr><td colspan="5">Sin temas registrados.</td></tr>
            @endforelse
        </tbody>
    </table>

    <table class="indicadores">
        <thead>
            <tr><th style="width:75%;">Indicadores de alcance</th><th style="width:25%;">Valor del indicador</th></tr>
        </thead>
        <tbody>
            @forelse(($comp['indicadores_alcance'] ?? []) as $ind)
            <tr><td>{{ $ind['letra'] }}. {{ $ind['indicador'] }}</td><td class="num">{{ $ind['valor'] ?? '—' }}</td></tr>
            @empty
            <tr><td colspan="2">Sin indicadores registrados.</td></tr>
            @endforelse
        </tbody>
    </table>

    <table class="niveles">
        <thead>
            <tr><th>Desempeño</th><th>Nivel de desempeño</th><th>Indicadores de alcance</th><th>Valoración numérica</th></tr>
        </thead>
        <tbody>
            @forelse(($comp['niveles_desempeno'] ?? []) as $niv)
            <tr>
                <td>{{ $desempenoGrupo($niv['nivel']) }}</td>
                <td>{{ $niv['nivel'] }}</td>
                <td>{{ $niv['indicadores'] ?: '—' }}</td>
                <td class="num">{{ $rangoValoracion[$niv['nivel']] ?? '—' }}</td>
            </tr>
            @empty
            <tr><td colspan="4">Sin niveles de desempeño registrados.</td></tr>
            @endforelse
        </tbody>
    </table>

    <table class="matriz">
        <thead>
            <tr>
                <th style="width:34%;">Evidencia de aprendizaje</th>
                <th style="width:10%;">%</th>
                <th style="width:{{ 30 }}%;">Indicador de alcance ({{ $letras->implode(', ') ?: '—' }})</th>
                <th style="width:26%;">Evaluación formativa de la competencia</th>
            </tr>
        </thead>
        <tbody>
            @forelse(($comp['matriz_evaluacion'] ?? []) as $fila)
            <tr>
                <td>{{ $fila['evidencia'] ?: '—' }}</td>
                <td class="num">{{ $fila['porcentaje'] ?? '—' }}</td>
                <td class="num">{{ $listar($fila['indicadores'] ?? null) }}</td>
                <td>{{ $fila['evaluacion_formativa'] ?: '—' }}</td>
            </tr>
            @empty
            <tr><td colspan="4">Sin evidencias registradas.</td></tr>
            @endforelse
            @if(!empty($comp['matriz_evaluacion']))
            <tr>
                <td style="text-align:right;font-weight:bold;">Total</td>
                <td class="num" style="font-weight:bold;">{{ collect($comp['matriz_evaluacion'])->sum('porcentaje') }}</td>
                <td colspan="2"></td>
            </tr>
            @endif
        </tbody>
    </table>

    <table class="fuentes-apoyo">
        <thead><tr><th style="width:50%;">Fuentes de información</th><th style="width:50%;">Apoyos didácticos</th></tr></thead>
        <tbody>
            <tr>
                <td>
                    @forelse((is_array($comp['fuentes_informacion'] ?? null) ? $comp['fuentes_informacion'] : []) as $f)
                        {{ $f['autor'] ?? '' }} {{ !empty($f['anio']) ? '('.$f['anio'].')' : '' }} {{ $f['titulo'] ?? '' }}@if(!$loop->last)<br>@endif
                    @empty
                        —
                    @endforelse
                </td>
                <td>{{ $listar($comp['apoyos_didacticos'] ?? null) }}</td>
            </tr>
        </tbody>
    </table>

    @if(!empty($comp['practicas']) && is_array($comp['practicas']))
    <table class="practicas">
        <thead><tr><th style="width:30%;">Competencia</th><th style="width:40%;">Requisitos</th><th style="width:15%;">Semana</th><th style="width:15%;">Lugar</th></tr></thead>
        <tbody>
            @foreach($comp['practicas'] as $prac)
            <tr>
                <td>{{ $prac['nombre'] ?: '—' }}</td>
                <td>{{ $listar($prac['requisitos'] ?? null) }}</td>
                <td class="num">{{ $prac['semana'] ?? '—' }}</td>
                <td>{{ $prac['lugar'] ?: '—' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif
    @endforeach

    <div class="seccion-titulo">(6) Calendarización de evaluación (semanas)</div>
    <table class="evaluaciones">
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
            @forelse($evaluaciones as $ev)
            <tr>
                <td>{{ $ev['nombre_unidad'] ?: 'Tema '.$ev['unidad'] }}</td>
                <td class="num">{{ $ev['ultima_semana_contenido'] ?? '—' }}</td>
                <td class="num">{{ $ev['semana_evaluacion'] ?? '—' }}</td>
                <td>{{ $ev['fechas'] ?? '—' }}</td>
                <td><span class="badge {{ $ev['tipo'] === 'ES' ? 'badge-es' : '' }}">{{ $ev['tipo'] }}</span></td>
            </tr>
            @empty
            <tr><td colspan="5">Sin unidades registradas.</td></tr>
            @endforelse
        </tbody>
    </table>
    <p style="font-size:7.5pt;color:#555;">ED = Evaluación diagnóstica. EF n = Evaluación formativa. ES = Evaluación sumativa.</p>

    <div class="fecha-elab">
        Fecha de elaboración: {{ $fecha_elaboracion ?? $planeacion->entregada_en?->format('d/m/Y') ?? now()->format('d/m/Y') }}
    </div>

    <table class="firmas-row">
        <tr>
            <td class="firmas" style="width:50%;">
                @if(!empty($docente_nombre ?? $planeacion->docente?->name))
                    <strong style="font-size: 9pt;">{{ mb_strtoupper($docente_nombre ?? $planeacion->docente?->name) }}</strong><br>
                @endif
                Nombre y Firma del Docente
            </td>
            <td class="firmas" style="width:50%;">
                @if(!empty($jefe_nombre))
                    <strong style="font-size: 9pt;">{{ mb_strtoupper($jefe_nombre) }}</strong><br>
                @endif
                Vo. Bo. Jefe del Departamento
            </td>
        </tr>
    </table>

</body>
</html>

@php
use Carbon\Carbon;

$DIAS_LABEL = [
    'lunes'     => 'LUNES',
    'martes'    => 'MARTES',
    'miercoles' => 'MIÉRCOLES',
    'jueves'    => 'JUEVES',
    'viernes'   => 'VIERNES',
    'sabado'    => 'SÁBADO',
];
$DIAS = array_keys($DIAS_LABEL);

// Slots de hora (07:00 → 21:00, franjas de 1 hora)
$slots = [];
for ($h = 7; $h < 21; $h++) {
    $slots[] = sprintf('%02d:00', $h);
}

// Construir mapa slot × día → etiqueta (grupo-aula)
$horarioGrid = [];
foreach ($cargas as $carga) {
    $etiqueta = ($carga->grupo?->clave ?? '?') . ($carga->aula ? '-' . $carga->aula->nombre : '');
    foreach ($carga->horarios ?? [] as $h) {
        $inicioMin = intval(substr($h->hora_inicio, 0, 2)) * 60 + intval(substr($h->hora_inicio, 3, 2));
        $finMin    = intval(substr($h->hora_fin,    0, 2)) * 60 + intval(substr($h->hora_fin,    3, 2));
        foreach ($slots as $slot) {
            $slotMin = intval(substr($slot, 0, 2)) * 60;
            if ($slotMin >= $inicioMin && $slotMin < $finMin) {
                $horarioGrid[$slot][$h->dia_semana] = $etiqueta;
            }
        }
    }
}

// Horas al día
$horasDia = [];
foreach ($DIAS as $dia) {
    $total = 0;
    foreach ($cargas as $carga) {
        foreach ($carga->horarios ?? [] as $h) {
            if ($h->dia_semana === $dia) {
                $total += (intval(substr($h->hora_fin,0,2)) - intval(substr($h->hora_inicio,0,2)));
            }
        }
    }
    $horasDia[$dia] = $total;
}

$totalHorasGrupo = $cargas->sum('horas_semana');
$fechaHoy        = Carbon::now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY');

// Semestre 1 y 2 del periodo (si el periodo tiene fechas)
$sem1 = $periodo->fecha_inicio && $periodo->fecha_fin
    ? strtoupper(Carbon::parse($periodo->fecha_inicio)->locale('es')->isoFormat('D [DE] MMM [DE] YYYY'))
      . ' — ' .
      strtoupper(Carbon::parse($periodo->fecha_fin)->locale('es')->isoFormat('D [DE] MMM [DE] YYYY'))
    : strtoupper($periodo->nombre);
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; color: #111; }
page { size: letter portrait; }

/* ── Encabezado institucional ── */
.doc-header { width:100%; }
.doc-header td { padding:3px 5px; vertical-align:middle; }
.inst-name  { text-align:center; font-size:10pt; font-weight:bold; padding:4px; }
.tec-logo   { font-size:14pt; font-weight:bold; color:#006837; width:60px; text-align:center; }
.doc-title  { font-size:7pt; font-weight:bold; text-align:center; color:#555; }

/* ── Filas de info del docente ── */
.info-table { width:100%; border-collapse:collapse; }
.info-table td, .info-table th { padding:2px 4px; vertical-align:middle; }
.lbl { font-weight:bold; font-size:6.5pt; color:#555; background:#f5f5f5; white-space:nowrap; }
.val { font-weight:bold; font-size:8pt; }

/* ── Tabla de tipo de horas ── */
.horas-box { border:1px solid #aaa; }
.horas-box th { background:#333; color:#fff; font-size:6pt; padding:2px 3px; text-align:center; }
.horas-box td { text-align:center; font-size:8pt; font-weight:bold; padding:2px 3px; border-top:1px solid #aaa; }

/* ── Sección carga general ── */
.seccion-titulo {
    background:#222; color:#fff; font-size:8pt; font-weight:bold;
    text-align:center; padding:3px; letter-spacing:1px;
    text-transform:uppercase;
}
.carga-table { width:100%; border-collapse:collapse; border:1px solid #aaa; }
.carga-table th { background:#ddd; font-size:6.5pt; font-weight:bold; padding:3px 4px; border:1px solid #aaa; text-align:center; }
.carga-table td { border:1px solid #ccc; padding:2.5px 4px; font-size:7.5pt; }
.carga-table .carr { font-weight:bold; text-align:center; font-family:monospace; }
.carga-table .total-row td { background:#eef; font-weight:bold; }

/* ── Cuadrícula horaria ── */
.horario-table { width:100%; border-collapse:collapse; border:1px solid #aaa; margin-top:4px; }
.horario-table th { background:#333; color:#fff; font-size:6pt; padding:3px 2px; text-align:center; border:1px solid #555; }
.horario-table td { border:1px solid #ccc; padding:1.5px 2px; text-align:center; font-size:6.5pt; height:14px; }
.horario-table .hora-col { font-family:monospace; font-size:6pt; background:#f5f5f5; font-weight:bold; white-space:nowrap; width:36px; }
.horario-table .totales td { background:#ddd; font-weight:bold; font-size:7pt; }

/* Color por asignatura en cuadrícula */
.h-celda { font-size:5.5pt; font-weight:bold; padding:1px 2px; border-radius:1px; }

/* ── Horario de comida ── */
.comida-table { width:100%; border-collapse:collapse; border:1px solid #aaa; margin-top:4px; }
.comida-table th { background:#ddd; font-size:6.5pt; font-weight:bold; text-align:center; padding:2px; border:1px solid #aaa; }
.comida-table td { border:1px solid #ccc; padding:2.5px 4px; text-align:center; font-size:7pt; }

/* ── Firmas ── */
.firmas-table { width:100%; border-collapse:collapse; margin-top:10px; }
.firmas-table td { width:33%; text-align:center; padding-top:28px; vertical-align:bottom; }
.firma-linea { border-top:1px solid #555; padding-top:3px; font-size:6.5pt; font-weight:bold; color:#333; }
.firma-inst  { font-size:5.5pt; color:#555; }
</style>
</head>
<body style="padding:8mm 10mm;">

{{-- ── ENCABEZADO INSTITUCIONAL ── --}}
<table class="doc-header" style="margin-bottom:0;">
    <tr>
        <td colspan="3" class="inst-name">{{ $nombreInstitucion }}</td>
    </tr>
    <tr>
        <td class="tec-logo" rowspan="2" style="width:55px;">TEC</td>
        <td style="width:55%; border-right:1px solid #222; border-bottom:1px solid #aaa; padding:2px 6px;">
            <span class="lbl">NOMBRE</span>
            <div class="val" style="font-size:9pt;">{{ strtoupper($docente->name) }}</div>
        </td>
        <td rowspan="2" style="width:35%; vertical-align:top; padding:2px 4px;">
            <table class="horas-box" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr>
                        <th colspan="4">TIPO DE HORAS</th>
                    </tr>
                    <tr>
                        <th>TIPO A</th>
                        <th>TIPO B</th>
                        <th>T.COMPLETO</th>
                        <th>HONORARIOS</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{{ $docente->tipo_horas === 'A' ? $totalHorasGrupo : 0 }}</td>
                        <td>{{ $docente->tipo_horas === 'B' ? $totalHorasGrupo : 0 }}</td>
                        <td>{{ $docente->tipo_horas === 'TC' ? $totalHorasGrupo : 0 }}</td>
                        <td>0</td>
                    </tr>
                </tbody>
            </table>
            <table style="width:100%; border-collapse:collapse; margin-top:2px;">
                <tr>
                    <td style="font-size:6pt; padding:2px 3px;">Horas Frente a Grupo</td>
                    <td style="text-align:right; font-weight:bold; padding:2px 3px; font-size:8pt;">{{ $totalHorasGrupo }}</td>
                </tr>
                <tr style="background:#eef;">
                    <td style="font-size:6pt; padding:2px 3px; font-weight:bold;">Total</td>
                    <td style="text-align:right; font-weight:bold; padding:2px 3px; font-size:9pt; color:#00529B;">{{ $totalHorasGrupo }}</td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td style="border-right:1px solid #222; padding:2px 6px;">
            <span class="lbl">PERIODO</span>
            <div class="val" style="font-size:8pt;">{{ strtoupper($periodo->nombre) }}</div>
        </td>
    </tr>
    <tr>
        <td class="doc-title" style="border-right:1px solid #555; border-top:1px solid #555; padding:4px;">
            <div style="font-size:7pt; font-weight:bold; color:#006837;">Carga Académica y/o</div>
            <div style="font-size:7pt; font-weight:bold; color:#006837;">Administrativa</div>
        </td>
        <td colspan="2" style="border-top:1px solid #aaa; padding:2px 6px;">
            <table style="width:100%; border-collapse:collapse;">
                <tr>
                    <td style="width:33%; padding:2px;">
                        <span class="lbl">FOLIO</span>
                        <div class="val">INF</div>
                    </td>
                    <td style="width:33%; padding:2px;">
                        <span class="lbl">NO. DE HUELLA</span>
                        <div class="val">{{ $docente->no_huella ?? '—' }}</div>
                    </td>
                    <td style="padding:2px;">
                        <span class="lbl">CLAVE</span>
                        <div class="val font-mono">{{ $docente->clave_empleado ?? '—' }}</div>
                    </td>
                </tr>
                <tr>
                    <td colspan="3" style="padding:2px;">
                        <span class="lbl">NOMBRAMIENTO</span>
                        <div class="val" style="font-size:8pt;">{{ $docente->nombramiento ?? '—' }}</div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

{{-- ── CARGA GENERAL ── --}}
<div class="seccion-titulo" style="margin-top:5px;">Carga General</div>
<table class="carga-table">
    <thead>
        <tr>
            <th style="width:10%;">Carr. y Sem.</th>
            <th style="width:10%;">Grupo</th>
            <th style="width:12%;">Clave</th>
            <th>Asignaturas</th>
            <th style="width:9%;">Horas</th>
            <th style="width:9%;">Total</th>
        </tr>
    </thead>
    <tbody>
        @php $acum = 0; @endphp
        @forelse($cargas as $i => $carga)
            @php
                $carreraClave = $carga->grupo?->carrera?->clave
                    ?? $carga->materia?->carrera?->clave
                    ?? 'N/A';
                $semestre = $carga->grupo?->semestre ?? '?';
                $acum += $carga->horas_semana;
                $esUltima = $i === $cargas->count() - 1;
            @endphp
            <tr @if($esUltima) class="total-row" @endif>
                <td class="carr">{{ $carreraClave }}/{{ str_pad($semestre, 2, '0', STR_PAD_LEFT) }}</td>
                <td style="text-align:center; font-weight:bold;">{{ $carga->grupo?->clave ?? '—' }}</td>
                <td style="font-family:monospace; font-size:7pt;">{{ $carga->materia?->clave ?? '—' }}</td>
                <td>{{ $carga->materia?->nombre ?? '—' }}</td>
                <td style="text-align:center; font-weight:bold;">{{ $carga->horas_semana }}</td>
                <td style="text-align:center; font-weight:bold; color:#00529B;">
                    {{ $esUltima ? $acum : '' }}
                </td>
            </tr>
        @empty
            <tr><td colspan="6" style="text-align:center; color:#999; padding:6px;">Sin asignaturas asignadas.</td></tr>
        @endforelse
    </tbody>
</table>

{{-- ── CUADRÍCULA HORARIA ── --}}
<div class="seccion-titulo" style="margin-top:5px;">Horarios</div>
<table class="horario-table">
    <thead>
        <tr>
            <th class="hora-col" style="background:#333;">Hora</th>
            @foreach($DIAS_LABEL as $dia => $label)
                <th>{{ $label }}</th>
            @endforeach
        </tr>
    </thead>
    <tbody>
        @foreach($slots as $idx => $slot)
            @php
                $nextSlot = $slots[$idx + 1] ?? null;
                $rango = $nextSlot ? $slot . '-' . $nextSlot : $slot;
                $fila = $horarioGrid[$slot] ?? [];
                $tieneAlgo = count(array_filter($fila)) > 0;
            @endphp
            <tr @if(!$tieneAlgo) style="background:#fafafa;" @endif>
                <td class="hora-col">{{ substr($slot,0,5) }}-{{ $nextSlot ? substr($nextSlot,0,5) : '' }}</td>
                @foreach($DIAS as $dia)
                    <td>
                        @if(isset($fila[$dia]))
                            <span class="h-celda" style="background:#dbeafe; color:#1e3a5f; display:block;">
                                {{ $fila[$dia] }}
                            </span>
                        @endif
                    </td>
                @endforeach
            </tr>
        @endforeach
        {{-- Fila totales --}}
        <tr class="totales">
            <td class="hora-col" style="font-size:6pt;">Hrs/día</td>
            @foreach($DIAS as $dia)
                <td>{{ ($horasDia[$dia] ?? 0) > 0 ? $horasDia[$dia] : '' }}</td>
            @endforeach
        </tr>
    </tbody>
</table>

{{-- ── FECHA ── --}}
<div style="text-align:right; font-size:6.5pt; color:#555; margin-top:4px;">
    Teziutlán, Pue., {{ $fechaHoy }}
    &nbsp;&nbsp;|&nbsp;&nbsp;
    F-SAC-03
</div>

{{-- ── FIRMAS ── --}}
<table class="firmas-table">
    <tr>
        <td>
            <div class="firma-linea">{{ strtoupper($docente->name) }}</div>
            <div class="firma-inst">PERSONAL DOCENTE</div>
        </td>
        <td>
            <div class="firma-linea">&nbsp;</div>
            <div class="firma-inst">{{ strtoupper($nombreInstitucion) }}</div>
            <div class="firma-inst">JEFE(A) DE DIVISIÓN / COORDINADOR(A) DE CARRERA</div>
        </td>
        <td>
            <div class="firma-linea">&nbsp;</div>
            <div class="firma-inst">{{ strtoupper($nombreInstitucion) }}</div>
            <div class="firma-inst">SUBDIRECCIÓN ACADÉMICA</div>
        </td>
    </tr>
</table>

</body>
</html>

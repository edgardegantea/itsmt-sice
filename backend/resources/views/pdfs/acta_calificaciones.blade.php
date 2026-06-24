@php
  use Carbon\Carbon;
  $AZUL = '#1a3a5c';
  $carrera = $grupo->carrera;
  $fechaHoy = Carbon::now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
  $materia  = $carga?->materia;
  $alumnos  = $grupo->alumnos->sortBy(fn($a) => $a->user?->apellido_paterno);

  $DIA = ['lunes'=>'Lun','martes'=>'Mar','miercoles'=>'Mié','jueves'=>'Jue','viernes'=>'Vie','sabado'=>'Sáb'];
  $horarioStr = $carga?->horarios?->map(fn($h) => ($DIA[$h->dia_semana] ?? $h->dia_semana).' '.$h->hora_inicio.'-'.$h->hora_fin)->implode(', ');
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #1a1a1a; padding: 10mm 12mm; }

  .encabezado { width:100%; border-collapse:collapse; margin-bottom:10px; }
  .encabezado td { vertical-align:middle; }
  .inst { font-size:10pt; font-weight:bold; color:{{ $AZUL }}; line-height:1.3; }
  .dep  { font-size:8pt; color:#555; margin-top:2px; }
  .meta { text-align:right; font-size:8pt; color:#777; }

  h2 { text-align:center; font-size:12pt; color:{{ $AZUL }}; text-transform:uppercase; margin:10px 0 6px; letter-spacing:1px; }

  .info { width:100%; border-collapse:collapse; margin-bottom:10px; font-size:8.5pt; }
  .info td { padding:3px 5px; }
  .info .lbl { font-weight:bold; width:130px; color:#444; }
  .info tr:nth-child(odd) { background:#f5f7fa; }

  table.alumnos { width:100%; border-collapse:collapse; margin-top:10px; font-size:8pt; }
  table.alumnos th { background:{{ $AZUL }}; color:#fff; padding:5px 6px; text-align:center; }
  table.alumnos td { padding:4px 6px; border-bottom:1px solid #e0e0e0; text-align:center; }
  table.alumnos td.nombre { text-align:left; }
  table.alumnos tr:hover { background:#f0f4f8; }

  .firmas { display:flex; justify-content:space-around; margin-top:30px; text-align:center; font-size:8pt; }
  .firma-bloque { width:200px; }
  .firma-bloque .linea { border-top:1px solid #333; margin-bottom:4px; padding-top:4px; }
  .firma-bloque .titulo { font-weight:bold; font-size:8pt; color:{{ $AZUL }}; text-transform:uppercase; }
  .firma-bloque .nombre { font-size:7.5pt; color:#555; margin-top:2px; }

  .pie { margin-top:14px; font-size:7pt; color:#777; text-align:center; }
  .sello { width:70px; height:70px; border:2px dashed #ccc; display:inline-block; vertical-align:middle; margin-left:10px; }
</style>
</head>
<body>

{{-- Encabezado institucional --}}
<table class="encabezado">
  <tr>
    <td style="width:80px;">
      <div style="width:64px;height:50px;background:#eee;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:7pt;color:#999;">LOGO</div>
    </td>
    <td>
      <div class="inst">TECNOLÓGICO NACIONAL DE MÉXICO</div>
      <div class="dep">CONTROL ESCOLAR — ACTA DE CALIFICACIONES</div>
    </td>
    <td class="meta">
      <div>Folio: {{ strtoupper($grupo->clave) }}</div>
      <div>Periodo: {{ $periodo?->nombre ?? '—' }}</div>
      <div>Fecha emisión: {{ $fechaHoy }}</div>
      @if($acta->firmada)
        <div style="color:green;font-weight:bold;">✓ FIRMADA</div>
      @endif
    </td>
  </tr>
</table>

<h2>Acta de Calificaciones</h2>

{{-- Datos del grupo / asignatura --}}
<table class="info">
  <tr><td class="lbl">Carrera:</td><td>{{ $carrera?->nombre ?? '—' }}</td><td class="lbl">Plan de Estudios:</td><td>{{ $carrera?->plan_estudios ?? '—' }}</td></tr>
  <tr><td class="lbl">Asignatura:</td><td>{{ $materia?->nombre ?? '—' }}</td><td class="lbl">Clave TecNM:</td><td>{{ $materia?->clave_oficial_tecnm ?? '—' }}</td></tr>
  <tr><td class="lbl">Grupo:</td><td>{{ $grupo->clave }}</td><td class="lbl">Semestre:</td><td>{{ $grupo->semestre ?? '—' }}</td></tr>
  <tr><td class="lbl">Docente:</td><td>{{ $docente?->nombre_completo ?? ($docente?->name ?? '—') }}</td><td class="lbl">Horario:</td><td>{{ $horarioStr ?? '—' }}</td></tr>
  <tr><td class="lbl">Créditos:</td><td>{{ $materia?->creditos ?? '—' }}</td><td class="lbl">Total alumnos:</td><td>{{ $alumnos->count() }}</td></tr>
</table>

{{-- Tabla de alumnos y calificaciones --}}
<table class="alumnos">
  <thead>
    <tr>
      <th style="width:30px;">#</th>
      <th style="width:100px;">N° Control</th>
      <th>Nombre del Alumno</th>
      <th>Parcial 1</th>
      <th>Parcial 2</th>
      <th>Parcial 3</th>
      <th>Cal. Final</th>
      <th>Promedio</th>
      <th>Acreditado</th>
    </tr>
  </thead>
  <tbody>
    @foreach($alumnos as $i => $alumno)
      @php
        $cal = $calificaciones[$alumno->id] ?? null;
        $parciales = collect($cal?->parciales ?? []);
        $p1 = $parciales->firstWhere('parcial', 1)['calificacion'] ?? '—';
        $p2 = $parciales->firstWhere('parcial', 2)['calificacion'] ?? '—';
        $p3 = $parciales->firstWhere('parcial', 3)['calificacion'] ?? '—';
      @endphp
      <tr>
        <td>{{ $i + 1 }}</td>
        <td>{{ $alumno->numero_control }}</td>
        <td class="nombre">{{ $alumno->user?->apellido_paterno }} {{ $alumno->user?->apellido_materno }}, {{ $alumno->user?->nombre }}</td>
        <td>{{ $p1 }}</td>
        <td>{{ $p2 }}</td>
        <td>{{ $p3 }}</td>
        <td>{{ $cal?->calificacion_final ?? '—' }}</td>
        <td style="font-weight:bold;">{{ $cal?->promedio ?? '—' }}</td>
        <td style="color:{{ $cal?->acreditado ? 'green' : ($cal ? 'red' : '#999') }};">
          {{ $cal ? ($cal->acreditado ? 'SÍ' : 'NO') : '—' }}
        </td>
      </tr>
    @endforeach
  </tbody>
</table>

{{-- Resumen estadístico --}}
@php
  $totalCal  = $calificaciones->count();
  $aprobados = $calificaciones->where('acreditado', true)->count();
  $reprobados= $calificaciones->where('acreditado', false)->count();
@endphp
<div style="margin-top:8px;font-size:8pt;color:#555;">
  Alumnos con calificación: <strong>{{ $totalCal }}</strong> &nbsp;|&nbsp;
  Acreditados: <strong style="color:green;">{{ $aprobados }}</strong> &nbsp;|&nbsp;
  No acreditados: <strong style="color:red;">{{ $reprobados }}</strong>
</div>

{{-- Firmas --}}
<div class="firmas">
  <div class="firma-bloque">
    <div style="height:50px;"></div>
    <div class="linea"></div>
    <div class="titulo">Docente</div>
    <div class="nombre">{{ $docente?->nombre_completo ?? ($docente?->name ?? '_____________________') }}</div>
  </div>
  <div class="firma-bloque">
    <div style="height:50px;"></div>
    <div class="linea"></div>
    <div class="titulo">Jefe de Departamento Académico</div>
    @if($acta->firmada)
      <div class="nombre">{{ $acta->firmadaPor?->nombre_completo ?? $acta->firmadaPor?->name ?? '—' }}</div>
      <div style="font-size:7pt;color:#555;">Firmada: {{ $acta->fecha_firma?->isoFormat('D/M/YYYY') }}</div>
    @else
      <div class="nombre">_____________________</div>
    @endif
  </div>
  <div class="firma-bloque">
    <div style="height:50px;"></div>
    <div class="linea"></div>
    <div class="titulo">Dirección Académica</div>
    <div class="nombre">_____________________</div>
  </div>
</div>

<div class="pie">
  Documento oficial TecNM — Retención PERMANENTE (TecNM-AC-PO-003, paso 10) — ID: {{ strtoupper($grupo->clave) }}
</div>

</body>
</html>

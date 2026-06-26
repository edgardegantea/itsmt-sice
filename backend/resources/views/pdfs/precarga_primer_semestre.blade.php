@php
  $logoB64 = $cfg->logoBase64();
  $AZUL    = '#1a3a5c';
  $DIAS    = ['lunes','martes','miercoles','jueves','viernes','sabado'];
  $DIA_LABEL = ['lunes'=>'Lunes','martes'=>'Martes','miercoles'=>'Miércoles','jueves'=>'Jueves','viernes'=>'Viernes','sabado'=>'Sábado'];
  $asp     = $alumno->inscripcion?->aspirante;
  $nombre  = $asp ? trim(($asp->nombres ?? '').' '.($asp->apellido_paterno ?? '').' '.($asp->apellido_materno ?? '')) : $user->name;
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:8.5pt; color:#111; padding:8mm 12mm; }
    .enc { width:100%; border-collapse:collapse; margin-bottom:6px; }
    .enc td { vertical-align:middle; }
    .enc .logo-td { width:60px; padding-right:10px; }
    .enc .logo-td img { height:50px; max-width:56px; object-fit:contain; }
    .enc .inst { font-size:9.5pt; font-weight:bold; color:{{ $AZUL }}; line-height:1.3; text-transform:uppercase; }
    .enc .dep  { font-size:7.5pt; color:#666; margin-top:2px; }
    .enc .meta { text-align:right; font-size:7.5pt; color:#888; white-space:nowrap; vertical-align:top; }
    .sep { height:3px; background:{{ $AZUL }}; margin:4px 0 3px; }
    .titulo { text-align:center; font-size:11pt; font-weight:bold; color:{{ $AZUL }};
              text-transform:uppercase; letter-spacing:0.5px; margin:10px 0 8px; }
    .info-grid { width:100%; border-collapse:collapse; font-size:8pt; margin-bottom:10px; }
    .info-grid td { padding:3px 6px; border:1px solid #ccc; }
    .info-grid td.lbl { font-weight:bold; background:#f0f4f8; color:{{ $AZUL }}; width:22%; }
    .sec-title { font-size:8pt; font-weight:bold; color:{{ $AZUL }};
                 text-transform:uppercase; border-bottom:1.5px solid {{ $AZUL }};
                 padding-bottom:2px; margin:10px 0 5px; letter-spacing:0.5px; }
    table.materias { width:100%; border-collapse:collapse; font-size:7.5pt; margin-bottom:10px; }
    table.materias th { background:{{ $AZUL }}; color:#fff; padding:4px 6px; text-align:left; font-weight:bold; }
    table.materias td { padding:4px 6px; border-bottom:1px solid #e0e0e0; vertical-align:top; }
    table.materias tr:nth-child(even) td { background:#f7f9fb; }
    .chip { display:inline-block; background:#e8f0fe; color:{{ $AZUL }};
            border-radius:3px; padding:1px 4px; font-size:7pt; margin:1px 1px 0 0; }
    /* Horario semanal */
    table.horario { width:100%; border-collapse:collapse; font-size:7pt; margin-top:6px; }
    table.horario th { background:{{ $AZUL }}; color:#fff; padding:3px 4px; text-align:center; font-weight:bold; }
    table.horario td { border:1px solid #d0d8e4; padding:3px 4px; vertical-align:top; min-width:55px; font-size:7pt; }
    table.horario td.hora { background:#f0f4f8; font-weight:bold; color:{{ $AZUL }}; text-align:center; width:45px; }
    .cell-materia { font-weight:bold; }
    .cell-aula { color:#555; }
    .footer { margin-top:16px; font-size:7.5pt; color:#999; text-align:center;
              border-top:1px solid #ddd; padding-top:5px; }
  </style>
</head>
<body>

<table class="enc">
  <tr>
    <td class="logo-td">
      @if($logoB64)<img src="{{ $logoB64 }}" alt="{{ $cfg->nombre_corto }}">@endif
    </td>
    <td>
      <div class="inst">{{ $cfg->nombre_completo ?? $cfg->nombre_corto }}</div>
      <div class="dep">Control Escolar</div>
    </td>
    <td class="meta">
      Folio: PRECARGA-{{ strtoupper($alumno->numero_control) }}<br>
      Fecha: {{ now()->format('d/m/Y') }}<br>
      Periodo: {{ $periodo->nombre }}
    </td>
  </tr>
</table>
<div class="sep"></div>

<div class="titulo">Pre-carga Académica — Primer Semestre</div>

<table class="info-grid">
  <tr>
    <td class="lbl">Alumno</td><td>{{ strtoupper($nombre) }}</td>
    <td class="lbl">No. Control</td><td>{{ strtoupper($alumno->numero_control) }}</td>
  </tr>
  <tr>
    <td class="lbl">Carrera</td><td colspan="3">{{ strtoupper($alumno->carrera?->nombre ?? '—') }}</td>
  </tr>
  <tr>
    <td class="lbl">Periodo</td><td>{{ $periodo->nombre }}</td>
    <td class="lbl">Semestre</td><td>1° Semestre</td>
  </tr>
</table>

<div class="sec-title">Asignaturas del Semestre</div>
<table class="materias">
  <thead>
    <tr>
      <th>#</th><th>Clave</th><th>Asignatura</th><th>Docente</th><th>Aula</th><th>Hrs/sem</th><th>Horarios</th>
    </tr>
  </thead>
  <tbody>
    @forelse($cargas as $i => $c)
    <tr>
      <td>{{ $i + 1 }}</td>
      <td>{{ $c->materia?->clave }}</td>
      <td>{{ $c->materia?->nombre }}</td>
      <td>{{ $c->docente?->name ?? '—' }}</td>
      <td>{{ $c->aula?->nombre ?? '—' }}</td>
      <td style="text-align:center">{{ $c->horas_semana }}</td>
      <td>
        @foreach($c->horarios as $h)
          <span class="chip">{{ ucfirst($h->dia_semana) }} {{ substr($h->hora_inicio,0,5) }}–{{ substr($h->hora_fin,0,5) }}</span>
        @endforeach
      </td>
    </tr>
    @empty
    <tr><td colspan="7" style="text-align:center;color:#999">No hay asignaturas registradas.</td></tr>
    @endforelse
  </tbody>
</table>

@php
  /* Construir rejilla semanal de 7:00 a 20:00 */
  $horas = range(7, 19);
  /* Indexar cargas por día y hora */
  $grid = [];
  foreach ($cargas as $c) {
    foreach ($c->horarios as $h) {
      $dia = $h->dia_semana === 'miércoles' ? 'miercoles' : $h->dia_semana;
      $hInicio = (int) substr($h->hora_inicio, 0, 2);
      $mInicio = (int) substr($h->hora_inicio, 3, 2);
      $hFin    = (int) substr($h->hora_fin, 0, 2);
      $mFin    = (int) substr($h->hora_fin, 3, 2);
      for ($hh = $hInicio; $hh < $hFin || ($hh === $hInicio && $mFin > 0 && $mFin <= 60); $hh++) {
        if ($hh >= 7 && $hh <= 19) {
          $grid[$hh][$dia][] = [
            'nombre' => $c->materia?->nombre ?? '',
            'aula'   => $c->aula?->nombre ?? '',
            'inicio' => $hInicio,
            'fin'    => $hFin,
            'minIni' => $mInicio,
            'minFin' => $mFin,
          ];
        }
        // Solo marcar la hora de inicio (sin repetir)
        break;
      }
    }
  }
@endphp

<div class="sec-title" style="margin-top:12px">Horario Semanal</div>
<table class="horario">
  <thead>
    <tr>
      <th>Hora</th>
      @foreach($DIAS as $d)
        <th>{{ $DIA_LABEL[$d] }}</th>
      @endforeach
    </tr>
  </thead>
  <tbody>
    @foreach($horas as $h)
    <tr>
      <td class="hora">{{ sprintf('%02d:00',$h) }}</td>
      @foreach($DIAS as $d)
      <td>
        @if(!empty($grid[$h][$d]))
          @foreach($grid[$h][$d] as $item)
            <div class="cell-materia">{{ $item['nombre'] }}</div>
            @if($item['aula'])<div class="cell-aula">{{ $item['aula'] }}</div>@endif
          @endforeach
        @endif
      </td>
      @endforeach
    </tr>
    @endforeach
  </tbody>
</table>

<div class="footer">
  Este documento es informativo. El horario está sujeto a cambios según disposición institucional.<br>
  {{ $cfg->nombre_corto }} — {{ now()->format('d \d\e F \d\e Y') }}
</div>

</body>
</html>

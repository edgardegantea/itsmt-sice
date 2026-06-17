@php
  $cfg     = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();
  $logoB64 = $cfg->logoBase64();
  $asp     = $alumno->inscripcion?->aspirante;
  $AZUL    = '#1a3a5c';
  $DIAS    = ['lunes','martes','miercoles','miércoles','jueves','viernes','sabado','sábado'];
  $DIA_LABEL = ['lunes'=>'Lun','martes'=>'Mar','miercoles'=>'Mié','miércoles'=>'Mié','jueves'=>'Jue','viernes'=>'Vie','sabado'=>'Sáb','sábado'=>'Sáb'];
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 8.5pt; color: #111; padding: 8mm 12mm; text-transform: uppercase; }

    .enc { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    .enc td { vertical-align: middle; }
    .enc .logo-td { width: 60px; padding-right: 10px; }
    .enc .logo-td img { height: 50px; max-width: 56px; object-fit: contain; }
    .enc .inst { font-size: 9.5pt; font-weight: bold; color: {{ $AZUL }}; line-height: 1.3; }
    .enc .dep  { font-size: 7.5pt; color: #666; margin-top: 2px; }
    .enc .meta { text-align: right; font-size: 7.5pt; color: #888; white-space: nowrap; vertical-align: top; }
    .sep { height: 3px; background: {{ $AZUL }}; margin: 4px 0 3px; }

    .titulo { text-align: center; font-size: 11pt; font-weight: bold; color: {{ $AZUL }};
              text-transform: uppercase; letter-spacing: 0.5px; margin: 10px 0 8px; }

    .alumno-info { width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 10px; }
    .alumno-info td { padding: 3px 6px; border: 1px solid #ccc; }
    .alumno-info td.lbl { font-weight: bold; background: #f0f4f8; color: {{ $AZUL }}; width: 22%; }

    .sec-title { font-size: 8pt; font-weight: bold; color: {{ $AZUL }};
                 text-transform: uppercase; border-bottom: 1.5px solid {{ $AZUL }};
                 padding-bottom: 2px; margin: 10px 0 5px; letter-spacing: 0.5px; }

    table.cargas { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 8px; }
    table.cargas th { background: {{ $AZUL }}; color: #fff; padding: 4px 6px; text-align: left; font-weight: bold; }
    table.cargas td { padding: 4px 6px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
    table.cargas tr:nth-child(even) td { background: #f7f9fb; }

    .horario-chip { display: inline-block; background: #e8f0fe; color: {{ $AZUL }};
                    border-radius: 3px; padding: 1px 4px; font-size: 7pt; margin: 1px 1px 0 0; }

    .firmas { margin-top: 40px; width: 100%; border-collapse: collapse; }
    .firmas td { text-align: center; padding: 0 15px; width: 50%; }
    .firma-linea { border-top: 1px solid #333; padding-top: 5px; margin-top: 45px; font-size: 8.5pt; }
    .firma-cargo { font-size: 7.5pt; color: #555; margin-top: 2px; }

    .footer { margin-top: 20px; font-size: 7.5pt; color: #999; text-align: center;
              border-top: 1px solid #ddd; padding-top: 6px; }
  </style>
</head>
<body>

  <table class="enc">
    <tr>
      <td class="logo-td">
        @if($logoB64)<img src="{{ $logoB64 }}" alt="{{ $cfg->nombre_corto }}">@endif
      </td>
      <td>
        <div class="inst">{{ $cfg->nombre_institucion }}</div>
        <div class="dep">Departamento de Servicios Escolares</div>
      </td>
      <td class="meta">
        @if($cfg->clave_tecnm)<strong>{{ $cfg->clave_tecnm }}</strong><br>@endif
        {{ now()->format('d/m/Y') }}
      </td>
    </tr>
  </table>
  <div class="sep"></div>

  <div class="titulo">Carga Académica — {{ $periodo->nombre }}</div>

  <table class="alumno-info">
    <tr>
      <td class="lbl">Nombre</td>
      <td>{{ $asp ? mb_strtoupper(trim("{$asp->apellido_paterno} {$asp->apellido_materno} {$asp->nombres}"), 'UTF-8') : mb_strtoupper($alumno->user?->name ?? '—', 'UTF-8') }}</td>
      <td class="lbl">N° Control</td>
      <td><strong>{{ $alumno->numero_control }}</strong></td>
    </tr>
    <tr>
      <td class="lbl">Carrera</td>
      <td>{{ $alumno->carrera?->nombre ?? '—' }}</td>
      <td class="lbl">Semestre</td>
      <td>{{ $alumno->semestre_actual }}°</td>
    </tr>
    <tr>
      <td class="lbl">Periodo</td>
      <td>{{ $periodo->nombre }}</td>
      <td class="lbl">Tipo ingreso</td>
      <td>{{ ucfirst($alumno->tipo_ingreso ?? 'Nuevo ingreso') }}</td>
    </tr>
  </table>

  <div class="sec-title">Asignaturas inscritas</div>

  @if($cargas->isEmpty())
    <p style="color:#888; font-size:8pt; padding:8px 0;">No se encontraron asignaturas para este alumno en el periodo seleccionado.</p>
  @else
    <table class="cargas">
      <thead>
        <tr>
          <th style="width:30%">Asignatura</th>
          <th style="width:18%">Docente</th>
          <th style="width:10%">Grupo</th>
          <th style="width:10%">Aula</th>
          <th style="width:8%">Hrs/sem</th>
          <th style="width:24%">Horario</th>
        </tr>
      </thead>
      <tbody>
        @foreach($cargas as $c)
        <tr>
          <td>{{ $c->materia?->nombre ?? '—' }}</td>
          <td>{{ $c->docente?->name ?? '—' }}</td>
          <td>{{ $c->grupo?->nombre ?? '—' }}</td>
          <td>{{ $c->aula?->nombre ?? '—' }}</td>
          <td style="text-align:center">{{ $c->horas_semana ?? '—' }}</td>
          <td>
            @forelse($c->horarios as $h)
              <span class="horario-chip">
                {{ mb_strtoupper(mb_substr($h->dia ?? '', 0, 3, 'UTF-8'), 'UTF-8') }} {{ $h->hora_inicio ? \Carbon\Carbon::createFromFormat('H:i:s', $h->hora_inicio)->format('H:i') : '' }}–{{ $h->hora_fin ? \Carbon\Carbon::createFromFormat('H:i:s', $h->hora_fin)->format('H:i') : '' }}
              </span>
            @empty
              <span style="color:#aaa">—</span>
            @endforelse
          </td>
        </tr>
        @endforeach
      </tbody>
    </table>
    <p style="font-size:7.5pt; color:#666; text-align:right; margin-top:4px;">
      Total: {{ $cargas->count() }} asignatura(s) ·
      {{ $cargas->sum('horas_semana') }} hrs/sem
    </p>
  @endif

  <table class="firmas">
    <tr>
      <td>
        <div class="firma-linea">{{ $cfg->subdirector_academico ?? '___________________________' }}</div>
        <div class="firma-cargo">Subdirector(a) Académico(a)</div>
      </td>
      <td>
        <div class="firma-linea">{{ $cfg->responsable_servicios_escolares ?? '___________________________' }}</div>
        <div class="firma-cargo">Jefe(a) de Servicios Escolares</div>
      </td>
    </tr>
  </table>

  <div class="footer">
    {{ $cfg->nombre_institucion }} · {{ $cfg->municipio ?? '' }}, {{ $cfg->estado ?? '' }}
    @if($cfg->telefono) · Tel. {{ $cfg->telefono }} @endif
  </div>

</body>
</html>

@php
  $cfg     = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();
  $logoB64 = $cfg->logoBase64();
  $alumno  = $constancia->alumno;
  $carrera = $alumno->carrera ?? $alumno->inscripcion?->carrera;
  $periodo = $alumno->periodoIngreso;
  $AZUL    = '#1a3a5c';

  $tipoLabel = match($constancia->tipo) {
    'estudios'      => 'CONSTANCIA DE ESTUDIOS',
    'inscripcion'   => 'CONSTANCIA DE INSCRIPCIÓN',
    'calificaciones'=> 'CONSTANCIA DE CALIFICACIONES',
    default         => 'CONSTANCIA',
  };

  $cuerpo = match($constancia->tipo) {
    'estudios' => "se encuentra actualmente inscrito(a) y cursando el {$alumno->semestre_actual}° semestre de la carrera de <strong>{$carrera?->nombre}</strong>.",
    'inscripcion' => "se inscribió de manera regular en el periodo <strong>{$periodo?->nombre}</strong>, en la carrera de <strong>{$carrera?->nombre}</strong>.",
    'calificaciones' => "ha cursado satisfactoriamente las asignaturas correspondientes al {$alumno->semestre_actual}° semestre de la carrera de <strong>{$carrera?->nombre}</strong>.",
    default => "es alumno(a) de esta institución.",
  };

  $fechaEmision = $constancia->emitida_at
    ? \Carbon\Carbon::parse($constancia->emitida_at)->locale('es')->isoFormat('D [de] MMMM [de] YYYY')
    : now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a1a; padding: 10mm 15mm; }

    .enc { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .enc td { vertical-align: middle; }
    .enc .logo-td { width: 64px; padding-right: 12px; }
    .enc .logo-td img { height: 54px; max-width: 60px; object-fit: contain; }
    .enc .inst { font-size: 10pt; font-weight: bold; color: {{ $AZUL }}; line-height: 1.3; }
    .enc .dep  { font-size: 8pt; color: #666; margin-top: 3px; }
    .enc .meta { text-align: right; font-size: 8pt; color: #888; white-space: nowrap; vertical-align: top; }
    .sep { height: 3px; background: {{ $AZUL }}; margin: 6px 0 4px; }

    .folio { text-align: right; font-size: 8pt; color: #777; margin-bottom: 20px; }

    .titulo {
      text-align: center; font-size: 13pt; font-weight: bold;
      color: {{ $AZUL }}; text-transform: uppercase; letter-spacing: 1px;
      border: 2px solid {{ $AZUL }}; padding: 8px 12px; margin: 16px 0 24px;
    }

    .cuerpo { font-size: 10.5pt; line-height: 1.9; text-align: justify; margin-bottom: 20px; }
    .cuerpo p { margin-bottom: 14px; }

    .datos { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 9.5pt; }
    .datos td { padding: 5px 8px; border: 1px solid #ccc; }
    .datos td.lbl { font-weight: bold; background: #f0f4f8; color: {{ $AZUL }}; width: 38%; }

    .firmas { margin-top: 60px; width: 100%; border-collapse: collapse; }
    .firmas td { text-align: center; width: 50%; padding: 0 20px; vertical-align: bottom; }
    .firma-linea { border-top: 1px solid #333; padding-top: 6px; margin-top: 50px; font-size: 9pt; }
    .firma-cargo { font-size: 8pt; color: #555; margin-top: 2px; }

    .footer { margin-top: 30px; font-size: 8pt; color: #888; text-align: center;
              border-top: 1px solid #ddd; padding-top: 8px; }
  </style>
</head>
<body>

  {{-- Encabezado institucional --}}
  <table class="enc">
    <tr>
      <td class="logo-td">
        @if($logoB64)
          <img src="{{ $logoB64 }}" alt="{{ $cfg->nombre_corto }}">
        @endif
      </td>
      <td>
        <div class="inst">{{ $cfg->nombre_institucion }}</div>
        <div class="dep">{{ $cfg->dependencia ?? 'Departamento de Servicios Escolares' }}</div>
      </td>
      <td class="meta">
        @if($cfg->clave_tecnm)<strong>{{ $cfg->clave_tecnm }}</strong><br>@endif
        {{ now()->format('d/m/Y') }}
      </td>
    </tr>
  </table>
  <div class="sep"></div>

  <div class="folio">Folio: <strong>{{ $constancia->folio_unico }}</strong></div>

  <div class="titulo">{{ $tipoLabel }}</div>

  <div class="cuerpo">
    <p>
      La Dirección del <strong>{{ $cfg->nombre_institucion }}</strong>, hace constar que el(la) alumno(a)
      <strong>{{ $alumno->nombre_completo ?? ($alumno->inscripcion?->aspirante?->nombre_completo ?? strtoupper($alumno->user?->name ?? '')) }}</strong>,
      con número de control <strong>{{ $alumno->numero_control }}</strong>,
      {!! $cuerpo !!}
    </p>
    <p>
      La presente constancia se expide a petición del(la) interesado(a), en
      {{ $cfg->ciudad ?? 'Martínez de la Torre' }}, {{ $cfg->estado ?? 'Veracruz' }},
      a {{ $fechaEmision }}.
    </p>
    @if($constancia->observaciones)
      <p><strong>Observaciones:</strong> {{ $constancia->observaciones }}</p>
    @endif
  </div>

  <table class="firmas">
    <tr>
      <td>
        <div class="firma-linea">{{ $cfg->director_general ?? $cfg->responsable_servicios_escolares ?? '___________________________' }}</div>
        <div class="firma-cargo">{{ $cfg->cargo_director ?? 'Director(a) General' }}</div>
      </td>
      <td>
        <div class="firma-linea">{{ $constancia->emitidaPor?->name ?? '___________________________' }}</div>
        <div class="firma-cargo">Jefe(a) de Departamento de Servicios Escolares</div>
      </td>
    </tr>
  </table>

  <div class="footer">
    {{ $cfg->nombre_institucion }} · {{ $cfg->municipio ?? '' }} · {{ $cfg->ciudad ?? '' }}, {{ $cfg->estado ?? '' }}
    @if($cfg->telefono) · Tel. {{ $cfg->telefono }} @endif
  </div>

</body>
</html>

@include('pdfs.partials.header')

<div class="folio">TecNM-AC-PO-001-05 · Folio: {{ $inscripcion->numero_control }}-CCD</div>
<div class="title">CARTA COMPROMISO DE ENTREGA DE DOCUMENTOS</div>

<p class="parrafo" style="font-size:9pt; margin-bottom:12px; text-align:justify;">
  En {{ $cfg->ciudad ?? 'la ciudad' }}{{ $cfg->estado ? ', ' . $cfg->estado : '' }}, a {{ now()->format('d') }} de {{ now()->translatedFormat('F') }} de {{ now()->format('Y') }},
  el alumno <strong>{{ mb_strtoupper($inscripcion->aspirante->nombres . ' ' . $inscripcion->aspirante->apellido_paterno . ' ' . $inscripcion->aspirante->apellido_materno, 'UTF-8') }}</strong>,
  con CURP <strong>{{ $inscripcion->aspirante->curp }}</strong> y número de control <strong>{{ $inscripcion->numero_control }}</strong>,
  inscrito en la carrera de <strong>{{ mb_strtoupper($inscripcion->carrera->nombre) }}</strong>,
  manifiesta bajo protesta de decir verdad que:
</p>

<p style="font-size:9pt; margin-bottom:10px;">
  <strong>Que al momento de su inscripción formal no presentó el Certificado de Bachillerato original</strong>,
  y que se compromete a entregarlo a Servicios Escolares del {{ $cfg->nombre_institucion }}
  <strong>a más tardar antes del inicio del proceso de reinscripción del siguiente periodo</strong>
  ({{ $inscripcion->periodo->nombre }}, antes del {{ optional($inscripcion->periodo->fecha_limite_baja_parcial)->format('d/m/Y') ?? 'fecha por confirmar' }}).
</p>

<p style="font-size:9pt; margin-bottom:16px;">
  El alumno es consciente de que el incumplimiento de esta carta compromiso implicará el <strong>bloqueo automático
  de su reinscripción</strong> en el siguiente periodo, de conformidad con el procedimiento TecNM-AC-PO-001.
</p>

<div class="section">DOCUMENTOS PENDIENTES DE ENTREGA</div>
<table class="datos" style="margin-bottom:12px;">
  <tr>
    <td class="label">Certificado de Bachillerato original</td>
    <td style="text-align:center; color: #c0392b;">⚠ PENDIENTE</td>
  </tr>
</table>

<!-- <div style="display: flex; justify-content: space-between; margin-top: 30px;">
  <div class="firma-block">
    <div class="firma-line"></div>
    <p>Firma del Alumno</p>
    <p style="font-size:8pt;">{{ $inscripcion->aspirante->nombres }} {{ $inscripcion->aspirante->apellido_paterno }}</p>
    <p style="font-size:8pt;">NC: {{ $inscripcion->numero_control }}</p>
  </div>
  <div class="firma-block">
    <div class="firma-line"></div>
    <p style="font-size:8pt; font-weight:bold;">{{ mb_strtoupper($jefeControlEscolar?->name ?? '___________________________', 'UTF-8') }}</p>
    <p>{{ $jefeControlEscolar?->cargo ?? 'Jefe(a) de Control Escolar' }}</p>
    <p style="font-size:8pt;">{{ $cfg->nombre_institucion }}</p>
  </div>
</div> -->



<div style="display: flex; justify-content: space-between; margin-top: 30px;">
  <div class="firma-block">
    <div class="firma-line"></div>
    <p style="font-weight:bold;">{{ mb_strtoupper($inscripcion->aspirante->nombres . ' ' . $inscripcion->aspirante->apellido_paterno, 'UTF-8') }}</p>
    <p style="font-size: 8pt">Estudiante</p>
  </div>
  <div class="firma-block">
    <div class="firma-line"></div>
    <p style="font-weight:bold;">{{ mb_strtoupper($jefeControlEscolar?->name ?? '___________________________', 'UTF-8') }}</p>
    <p style="font-size: 8pt">{{ $jefeControlEscolar?->cargo ?? 'Jefe(a) de Control Escolar' }}</p>
    <p style="font-size: 8pt">{{ $cfg->nombre_institucion }}</p>
  </div>
</div>

@php $folio = $inscripcion->numero_control . '-CCD' @endphp
@include('pdfs.partials.footer')

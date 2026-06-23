@include('pdfs.partials.header')

<div class="folio">Art. 2 Reglamento de Estudiantes TecNM · Folio: {{ $inscripcion->numero_control }}-CC</div>
<div class="title">CARTA COMPROMISO DEL ESTUDIANTE</div>

<div class="lugaryfecha">@if($cfg->ciudad){{ $cfg->ciudad }}{{ $cfg->estado ? ', ' . $cfg->estado : '' }}; a {{ now()->format('d/m/Y') }}@endif</div>


@php
    // Obtenemos la CURP (se asume que existe en el modelo aspirante)
    $curp = $inscripcion->aspirante->curp ?? '';
    
    // La letra del sexo está en la posición 11 (índice 10 en programación)
    // Extraemos la letra y la convertimos a mayúscula por seguridad
    $letraSexo = strlen($curp) >= 11 ? strtoupper(substr($curp, 10, 1)) : '';

    // Determinamos el prefijo basado en la letra de la CURP
    $textoAlumno = ($letraSexo === 'M') ? 'la alumna' : 'el alumno';
    $textoAlumno2 = ($letraSexo === 'M') ? 'inscrita' : 'inscrito';
@endphp


<p style="margin-bottom:10px;">
  En {{ $cfg->ciudad ?? 'la ciudad' }}{{ $cfg->estado ? ', ' . $cfg->estado : '' }}, a {{ now()->format('d') }} de {{ now()->translatedFormat('F') }} de {{ now()->format('Y') }}, {{ $textoAlumno }} <strong>{{ mb_strtoupper($inscripcion->aspirante->nombres . ' ' . $inscripcion->aspirante->apellido_paterno . ' ' . $inscripcion->aspirante->apellido_materno, 'UTF-8') }}</strong>,
  con CURP <strong>{{ $inscripcion->aspirante->curp }}</strong> y número de control <strong>{{ $inscripcion->numero_control }}</strong>, {{ $textoAlumno2 }} en la carrera de <strong>{{ mb_strtoupper($inscripcion->carrera->nombre, 'UTF-8') }}</strong>, manifiesta su conocimiento y aceptación de los siguientes compromisos:
</p>

<div class="section">COMPROMISOS DEL ESTUDIANTE</div>
<ol style="padding-left:18px; line-height:1.5;">
  <li>Cumplir puntualmente con el pago de cuotas y derechos escolares en los plazos establecidos.</li>
  <li>Acreditar el plan de estudios correspondiente a su carrera conforme a la normativa del TecNM.</li>
  <li>Hacer uso adecuado de las instalaciones, equipos y recursos de la institución.</li>
  <li>Observar y cumplir el Reglamento de Estudiantes del Tecnológico Nacional de México.</li>
  <li>Mantener conducta ética y respetuosa con la comunidad universitaria.</li>
  <li>Informar oportunamente cualquier cambio en su situación académica o personal.</li>
</ol>

<div class="section">COMPROMISOS DE LA INSTITUCIÓN</div>
<ol style="padding-left:18px; line-height:1.5;">
  <li>Proporcionar formación profesional de calidad conforme al plan de estudios TecNM.</li>
  <li>Garantizar atención en ventanilla y servicios escolares en horarios establecidos.</li>
  <li>Gestionar los trámites de reinscripción en los periodos correspondientes.</li>
  <li>Facilitar acceso a biblioteca, cómputo y laboratorios según normativa vigente.</li>
</ol>

<div style="display: flex; justify-content: space-between; margin-top: 30px;">
  <div class="firma-block">
    <div class="firma-line"></div>
    <p style="font-weight:bold;">{{ mb_strtoupper($inscripcion->aspirante->nombres . ' ' . $inscripcion->aspirante->apellido_paterno . ' ' . $inscripcion->aspirante->apellido_materno, 'UTF-8') }}</p>
    <p style="font-size: 8pt">Estudiante</p>
  </div>
  <div class="firma-block">
    <div class="firma-line"></div>
    <p style="font-weight:bold;">{{ mb_strtoupper($directorGeneral?->name ?? '___________________________', 'UTF-8') }}</p>
    <p style="font-size: 8pt">{{ $directorGeneral?->cargo ?? 'Director(a) General' }}</p>
    <p style="font-size: 8pt">{{ $cfg->nombre_institucion }}</p>
  </div>
</div>

@php $folio = $inscripcion->numero_control . '-CC' @endphp
@include('pdfs.partials.footer')

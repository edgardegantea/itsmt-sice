@include('pdfs.partials.header')

<div class="folio">TecNM-AC-PO-001-03 · Folio: {{ $inscripcion->numero_control }}-CT</div>
<div class="title">CONTRATO CON EL ESTUDIANTE</div>

<p style="font-size:9pt; margin-bottom:10px;">
  Contrato bilateral celebrado entre el <strong>Instituto Tecnológico Superior de Martínez de la Torre (ITSMT)</strong>
  y el alumno <strong>{{ $inscripcion->aspirante->nombres }} {{ $inscripcion->aspirante->apellido_paterno }} {{ $inscripcion->aspirante->apellido_materno }}</strong>,
  con número de control <strong>{{ $inscripcion->numero_control }}</strong>, para el periodo <strong>{{ $inscripcion->periodo->nombre }}</strong>.
</p>

<div class="section">PRIMERA — OBJETO DEL CONTRATO</div>
<p style="font-size:9pt; margin-bottom:8px;">
  El ITSMT se compromete a prestar servicios educativos de nivel superior en la carrera de
  <strong>{{ $inscripcion->carrera->nombre }}</strong>, conforme al plan de estudios aprobado por la Secretaría de Educación Pública
  y el Tecnológico Nacional de México.
</p>

<div class="section">SEGUNDA — OBLIGACIONES DE LA INSTITUCIÓN</div>
<ul style="font-size:9pt; padding-left:16px; line-height:1.7; margin-bottom:8px;">
  <li>Impartir los programas de estudio correspondientes al plan de la carrera.</li>
  <li>Emitir evaluaciones periódicas y actas de calificaciones en tiempo y forma.</li>
  <li>Otorgar servicios de biblioteca, laboratorio y cómputo conforme a reglamento.</li>
  <li>Tramitar los documentos oficiales (constancias, certificados) en los plazos institucionales.</li>
  <li>Brindar atención en ventanilla escolar para trámites, aclaraciones y servicios de Control Escolar.</li>
  <li>Gestionar el proceso de reinscripción semestral conforme al calendario institucional vigente.</li>
</ul>

<div class="section">TERCERA — OBLIGACIONES DEL ALUMNO</div>
<ul style="font-size:9pt; padding-left:16px; line-height:1.7; margin-bottom:8px;">
  <li>Cubrir las cuotas y derechos escolares en las fechas establecidas por el ITSMT.</li>
  <li>Cursar y acreditar las materias del semestre de acuerdo con el plan de estudios.</li>
  <li>Hacer buen uso de las instalaciones y equipo de la institución.</li>
  <li>Cumplir el Reglamento Interno de Estudiantes del TecNM vigente.</li>
</ul>

<div class="section">CUARTA — VIGENCIA</div>
<p style="font-size:9pt; margin-bottom:8px;">
  El presente contrato tiene vigencia durante el periodo académico
  <strong>{{ $inscripcion->periodo->nombre }}</strong>
  (del {{ $inscripcion->periodo->fecha_inicio->format('d/m/Y') }} al {{ $inscripcion->periodo->fecha_fin->format('d/m/Y') }}).
</p>

<div style="display: flex; justify-content: space-between; margin-top: 30px;">
  <div class="firma-block">
    <div class="firma-line"></div>
    <p>El Alumno</p>
    <p style="font-size:8pt;">{{ $inscripcion->aspirante->nombres }} {{ $inscripcion->aspirante->apellido_paterno }}</p>
    <p style="font-size:8pt;">NC: {{ $inscripcion->numero_control }}</p>
  </div>
  <div class="firma-block">
    <div class="firma-line"></div>
    <p>Por la Institución</p>
    <p style="font-size:8pt;">Subdirección Académica — ITSMT</p>
  </div>
</div>

@php $folio = $inscripcion->numero_control . '-CT' @endphp
@include('pdfs.partials.footer')

@php
  $AZUL   = '#1a3a5c';
  $ced    = $cedula;
  $cur    = $cedula->curso;
  $usr    = $cedula->usuario;
  $folio  = 'CIC-' . strtoupper(substr($cedula->id, 0, 8));
  $hoy    = now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
  $tipoLabel = $cur->tipo === 'formacion_docente' ? 'Formación Docente (FD)' : 'Actualización Profesional (AP)';
  $modalLabel = ['presencial'=>'Presencial (P)','distancia'=>'Distancia (D)','mixto'=>'Mixto (M)'][$cur->modalidad] ?? $cur->modalidad;
  $origenLabel = $cur->origen === 'interno' ? 'Interno (I)' : 'Externo (E)';
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a1a; }
    .header { text-align:center; border-bottom: 3px solid {{ $AZUL }}; padding-bottom:8px; margin-bottom:12px; }
    .header h1 { color: {{ $AZUL }}; font-size: 12pt; }
    .header p  { font-size: 8.5pt; color:#555; }
    .folio { text-align:right; font-size:8.5pt; color:#555; margin-bottom:10px; }
    h2 { color: {{ $AZUL }}; font-size: 10pt; text-transform:uppercase; background:#eef2f8; padding:4px 8px; margin:12px 0 6px; }
    table.data { width:100%; border-collapse:collapse; margin-bottom:8px; }
    table.data td { padding:4px 6px; font-size:9.5pt; vertical-align:top; }
    table.data td.lbl { color:#555; width:45%; }
    table.data td.val { font-weight:bold; }
    .curso-badge { display:inline-block; background:{{ $AZUL }}; color:#fff; padding:2px 8px; border-radius:3px; font-size:8.5pt; }
    .footer { margin-top:24px; text-align:center; font-size:7.5pt; color:#888; border-top:1px solid #ccc; padding-top:6px; }
    .firma-block { display:flex; justify-content:space-between; margin-top:40px; }
    .firma { text-align:center; width:45%; border-top:1px solid #333; padding-top:5px; font-size:8.5pt; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INSTITUTO TECNOLÓGICO SUPERIOR DE MISANTLA</h1>
    <p>Departamento de Desarrollo Académico</p>
    <p><strong>CÉDULA DE INSCRIPCIÓN</strong> — Formato TecNM-AC-PO-005-07</p>
  </div>

  <div class="folio">
    <strong>Folio:</strong> {{ $folio }} &nbsp;|&nbsp;
    <strong>Fecha:</strong> {{ $hoy }} &nbsp;|&nbsp;
    <span class="curso-badge">{{ $tipoLabel }}</span>
  </div>

  <h2>Datos del Curso</h2>
  <table class="data">
    <tr><td class="lbl">Nombre del curso:</td><td class="val" colspan="3">{{ $cur->nombre }}</td></tr>
    <tr>
      <td class="lbl">Clave TecNM:</td><td class="val">{{ $cur->clave_registro_tecnm ?? 'Por asignar' }}</td>
      <td class="lbl">Horas totales:</td><td class="val">{{ $cur->horas_totales }} hrs</td>
    </tr>
    <tr>
      <td class="lbl">Modalidad:</td><td class="val">{{ $modalLabel }}</td>
      <td class="lbl">Origen:</td><td class="val">{{ $origenLabel }}</td>
    </tr>
    <tr>
      <td class="lbl">Periodo:</td>
      <td class="val">{{ $cur->periodo_inicio?->format('d/m/Y') }} — {{ $cur->periodo_fin?->format('d/m/Y') }}</td>
      <td class="lbl">Horario:</td><td class="val">{{ $cur->horario ?? '—' }}</td>
    </tr>
    <tr><td class="lbl">Instructor:</td><td class="val" colspan="3">{{ $cur->instructor }}</td></tr>
  </table>

  <h2>Datos Personales del Participante</h2>
  <table class="data">
    <tr>
      <td class="lbl">Nombre completo:</td><td class="val">{{ $usr?->name ?? '—' }}</td>
      <td class="lbl">Sexo:</td><td class="val">{{ $ced->sexo === 'H' ? 'Hombre' : 'Mujer' }}</td>
    </tr>
    <tr>
      <td class="lbl">RFC:</td><td class="val">{{ $ced->rfc }}</td>
      <td class="lbl">CURP:</td><td class="val">{{ $ced->curp }}</td>
    </tr>
    <tr>
      <td class="lbl">Grado máximo de estudios:</td><td class="val" colspan="3">{{ $ced->grado_maximo_estudios }}</td>
    </tr>
  </table>

  <h2>Datos Laborales</h2>
  <table class="data">
    <tr>
      <td class="lbl">Área de adscripción:</td><td class="val">{{ $ced->area_adscripcion }}</td>
      <td class="lbl">Puesto:</td><td class="val">{{ $ced->puesto }}</td>
    </tr>
    <tr>
      <td class="lbl">Carrera:</td><td class="val">{{ $ced->nombre_carrera }}</td>
      <td class="lbl">Clave presupuestal:</td><td class="val">{{ $ced->clave_presupuestal }}</td>
    </tr>
    <tr>
      <td class="lbl">Jefe inmediato:</td><td class="val">{{ $ced->jefe_inmediato }}</td>
      <td class="lbl">Horario laboral:</td><td class="val">{{ $ced->horario_laboral }}</td>
    </tr>
    <tr>
      <td class="lbl">Teléfono oficial:</td><td class="val">{{ $ced->telefono_oficial }}</td>
      <td class="lbl">Ext.:</td><td class="val">{{ $ced->ext ?? '—' }}</td>
    </tr>
  </table>

  <div class="firma-block">
    <div class="firma">
      {{ $usr?->name ?? 'Participante' }}<br>
      <small>Firma del participante</small>
    </div>
    <div class="firma">
      {{ $cur->jefeDepto?->name ?? 'Jefe de Desarrollo Académico' }}<br>
      <small>Jefe del Depto. de Desarrollo Académico</small>
    </div>
  </div>

  <div class="footer">
    Formato TecNM-AC-PO-005-07 — Retención: INDEFINIDA — Custodia: Subdirección Académica<br>
    ITSMT SICE — Generado el {{ $hoy }}
  </div>
</body>
</html>

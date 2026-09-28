<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #1a1a1a; padding: 10mm 12mm; }
  h1 { text-align:center; font-size:13pt; color:#1a3a5c; text-transform:uppercase; margin-bottom:2px; }
  h2.sub { text-align:center; font-size:8pt; color:#777; font-weight:normal; margin-bottom:10px; }
  table.info { width:100%; border-collapse:collapse; margin-bottom:10px; font-size:8.5pt; }
  table.info td { padding:3px 5px; }
  table.info .lbl { font-weight:bold; width:110px; color:#444; }
  table.info tr:nth-child(odd) { background:#f5f7fa; }
  .estatus { display:inline-block; padding:2px 8px; border-radius:10px; font-size:8pt; font-weight:bold; color:#fff; background:#1a3a5c; }
  section { margin-bottom:12px; }
  section h3 { font-size:9pt; color:#1a3a5c; text-transform:uppercase; border-bottom:1px solid #d8dee6; padding-bottom:3px; margin-bottom:5px; }
  section p { font-size:8.5pt; line-height:1.4; white-space:pre-line; }
  ul.simple { margin-left:14px; font-size:8.5pt; line-height:1.4; }
  table.unidades { width:100%; border-collapse:collapse; font-size:8pt; margin-top:4px; }
  table.unidades th { background:#1a3a5c; color:#fff; padding:4px; text-align:left; }
  table.unidades td { padding:4px; border-bottom:1px solid #e0e0e0; vertical-align:top; }
  table.criterios { width:60%; border-collapse:collapse; font-size:8.5pt; margin-top:4px; }
  table.criterios td { padding:3px 6px; border-bottom:1px solid #eee; }
  table.criterios td.pct { text-align:right; font-weight:bold; width:60px; }
  .observaciones { background:#fffbea; border:1px solid #fde68a; border-radius:4px; padding:6px 8px; font-size:8.5pt; }
  .observaciones .tit { font-weight:bold; color:#92400e; text-transform:uppercase; font-size:7.5pt; margin-bottom:2px; }
  .vacio { color:#999; font-style:italic; }
  table.firmas { width:100%; border-collapse:collapse; margin-top:36px; }
  table.firmas td { width:33.33%; text-align:center; padding-top:6px; vertical-align:top; font-size:8pt; }
  table.firmas .linea { border-top:1px solid #1a1a1a; padding-top:4px; margin:0 10px; }
  table.firmas .nombre { font-weight:bold; }
  table.firmas .puesto { color:#555; }
</style>
</head>
<body>
  <h1>Instrumentación Didáctica</h1>
  <h2 class="sub">TecNM-AC-PO-003 — Control de la Planeación Didáctica</h2>

  <table class="info">
    <tr>
      <td class="lbl">Carrera:</td><td>{{ $asignacion?->carrera?->nombre ?? '—' }}</td>
      <td class="lbl">Periodo:</td><td>{{ $asignacion?->periodo?->nombre ?? '—' }}</td>
    </tr>
    <tr>
      <td class="lbl">Materia:</td><td>{{ $asignacion?->materia?->nombre ?? '—' }}</td>
      <td class="lbl">Clave:</td><td>{{ $asignacion?->materia?->clave ?? '—' }}</td>
    </tr>
    <tr>
      <td class="lbl">Docente:</td><td>{{ $asignacion?->docente?->name ?? '—' }}</td>
      <td class="lbl">Grupo:</td><td>{{ $asignacion?->grupo?->clave ?? '—' }}</td>
    </tr>
    <tr>
      <td class="lbl">Estatus:</td>
      <td><span class="estatus">{{ strtoupper(['borrador'=>'Borrador','enviada'=>'Enviada a revisión','observaciones'=>'Con observaciones','liberada'=>'Liberada','vigente'=>'Vigente'][$inst->estatus] ?? $inst->estatus) }}</span></td>
      <td class="lbl">Entrega:</td>
      <td>
        {{ $inst->entrega_en ? \Carbon\Carbon::parse($inst->entrega_en)->locale('es')->isoFormat('D [de] MMMM [de] YYYY, HH:mm') : '—' }}
        @if($inst->entrega_tardia) <span style="color:#b91c1c;font-weight:bold;">(tardía)</span> @endif
      </td>
    </tr>
  </table>

  <section>
    <h3>Objetivo General</h3>
    <p>{{ $inst->objetivo_general ?: '—' }}</p>
  </section>

  <section>
    <h3>Competencias</h3>
    @if(!empty($inst->competencias))
      <ul class="simple">
        @foreach($inst->competencias as $c)
          <li>{{ $c }}</li>
        @endforeach
      </ul>
    @else
      <p class="vacio">Sin competencias registradas.</p>
    @endif
  </section>

  <section>
    <h3>Unidades</h3>
    @if(!empty($inst->unidades))
      <table class="unidades">
        <thead>
          <tr>
            <th style="width:16%;">Unidad</th>
            <th style="width:21%;">Objetivo</th>
            <th style="width:21%;">Contenido</th>
            <th style="width:21%;">Actividades</th>
            <th style="width:21%;">Evaluación</th>
          </tr>
        </thead>
        <tbody>
          @foreach($inst->unidades as $u)
            <tr>
              <td>{{ $u['nombre'] ?? '—' }}</td>
              <td>{{ $u['objetivo'] ?? '—' }}</td>
              <td>{{ $u['contenido'] ?? '—' }}</td>
              <td>{{ $u['actividades'] ?? '—' }}</td>
              <td>{{ $u['evaluacion'] ?? '—' }}</td>
            </tr>
          @endforeach
        </tbody>
      </table>
    @else
      <p class="vacio">Sin unidades registradas.</p>
    @endif
  </section>

  <section>
    <h3>Metodología</h3>
    <p>{{ $inst->metodologia ?: '—' }}</p>
  </section>

  <section>
    <h3>Criterios de Evaluación</h3>
    @if(!empty($inst->criterios_evaluacion))
      <table class="criterios">
        @foreach($inst->criterios_evaluacion as $criterio => $pct)
          <tr><td>{{ $criterio }}</td><td class="pct">{{ $pct }}%</td></tr>
        @endforeach
      </table>
    @else
      <p class="vacio">Sin criterios registrados.</p>
    @endif
  </section>

  <section>
    <h3>Bibliografía</h3>
    <p>{{ $inst->bibliografia ?: '—' }}</p>
  </section>

  @if($inst->observaciones_jefe || !empty($inst->observaciones_campos))
    @php
      $seccionLabel = [
        'objetivo_general' => 'Objetivo general', 'competencias' => 'Competencias', 'unidades' => 'Unidades',
        'metodologia' => 'Metodología', 'criterios_evaluacion' => 'Criterios de evaluación', 'bibliografia' => 'Bibliografía',
      ];
    @endphp
    <section>
      <div class="observaciones">
        <p class="tit">Observaciones de la revisión</p>
        @if($inst->observaciones_jefe)
          <p>{{ $inst->observaciones_jefe }}</p>
        @endif
        @if(!empty($inst->observaciones_campos))
          <ul style="margin-left:14px;margin-top:4px;">
            @foreach($inst->observaciones_campos as $o)
              <li><strong>{{ $seccionLabel[$o['seccion']] ?? $o['seccion'] }}:</strong> {{ $o['texto'] }}</li>
            @endforeach
          </ul>
        @endif
      </div>
    </section>
  @endif

  <table class="firmas">
    <tr>
      <td>
        <div class="linea">
          <p class="nombre">{{ mb_strtoupper($asignacion?->docente?->name ?? '—') }}</p>
          <p class="puesto">Docente</p>
        </div>
      </td>
      <td>
        <div class="linea">
          <p class="nombre">{{ mb_strtoupper($inst->liberadaPor?->name ?? $asignacion?->carrera?->coordinador?->name ?? '—') }}</p>
          <p class="puesto">Vo. Bo. Jefe(a) de Carrera</p>
        </div>
      </td>
      <td>
        <div class="linea">
          <p class="nombre">{{ mb_strtoupper($inst->vistoBuenoPor?->name ?? '—') }}</p>
          <p class="puesto">Vo. Bo. Dirección Académica</p>
        </div>
      </td>
    </tr>
  </table>

  <p style="margin-top:10px;font-size:7pt;color:#777;">Generado el {{ now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY') }} — {{ $institucion->nombre_corto }} Sistema Integral de Control Escolar.</p>
</body>
</html>

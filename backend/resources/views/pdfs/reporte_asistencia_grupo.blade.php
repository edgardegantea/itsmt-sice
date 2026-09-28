<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #1a1a1a; padding: 10mm 12mm; text-transform: uppercase; }
  .AZUL { color: #1a3a5c; }
  h2 { text-align:center; font-size:12pt; color:#1a3a5c; text-transform:uppercase; margin:8px 0 10px; }
  table.info { width:100%; border-collapse:collapse; margin-bottom:10px; font-size:8.5pt; }
  table.info td { padding:3px 5px; }
  table.info .lbl { font-weight:bold; width:110px; color:#444; }
  table.info tr:nth-child(odd) { background:#f5f7fa; }
  table.lista { width:100%; border-collapse:collapse; font-size:8pt; }
  table.lista th { background:#1a3a5c; color:#fff; padding:5px 4px; text-align:center; }
  table.lista td { padding:5px 4px; border-bottom:1px solid #e0e0e0; text-align:center; }
  table.lista td.nombre { text-align:left; }
  .alerta { color:#b91c1c; font-weight:bold; }
  table.firmas { width:100%; border-collapse:collapse; margin-top:40px; }
  table.firmas td { width:50%; text-align:center; padding-top:6px; vertical-align:top; }
  table.firmas .linea { border-top:1px solid #1a1a1a; padding-top:4px; margin:0 20px; }
  table.firmas .nombre { font-weight:bold; }
  table.firmas .puesto { color:#555; }
</style>
</head>
<body>
  <h2>Reporte Acumulado de Asistencia</h2>
  <table class="info">
    <tr><td class="lbl">Carrera:</td><td>{{ $carrera?->nombre ?? '—' }}</td><td class="lbl">Periodo:</td><td>{{ $periodo?->nombre ?? '—' }}</td></tr>
    <tr><td class="lbl">Materia:</td><td>{{ $materia?->nombre ?? '—' }}</td><td class="lbl">Clave:</td><td>{{ $materia?->clave ?? '—' }}</td></tr>
    <tr><td class="lbl">Docente:</td><td>{{ $docente?->name ?? '—' }}</td><td class="lbl">Grupo(s):</td><td>{{ $gruposClave }}</td></tr>
    <tr><td class="lbl">Sesiones registradas:</td><td colspan="3">{{ $totalSesiones }}</td></tr>
    @if($rangoFechas ?? null)
      <tr><td class="lbl">Rango de fechas:</td><td colspan="3">{{ $rangoFechas }}</td></tr>
    @endif
  </table>

  <table class="lista">
    <thead>
      <tr>
        <th style="width:24px;">#</th>
        <th>Nombre del alumno</th>
        <th style="width:60px;">Presentes</th>
        <th style="width:60px;">Ausentes</th>
        <th style="width:60px;">Retardos</th>
        <th style="width:70px;">Justificados</th>
        <th style="width:70px;">% Inasist.</th>
      </tr>
    </thead>
    <tbody>
      @forelse($alumnos as $i => $a)
        <tr>
          <td>{{ $i + 1 }}</td>
          <td class="nombre">{{ $a['nombre'] }}</td>
          <td>{{ $a['presentes'] }}</td>
          <td>{{ $a['ausentes'] }}</td>
          <td>{{ $a['retardos'] }}</td>
          <td>{{ $a['justificados'] }}</td>
          <td class="{{ $a['porcentaje_inasistencia'] >= 25 ? 'alerta' : '' }}">{{ $a['porcentaje_inasistencia'] }}%</td>
        </tr>
      @empty
        <tr><td colspan="7">Sin sesiones registradas para este grupo.</td></tr>
      @endforelse
    </tbody>
  </table>

  <table class="firmas">
    <tr>
      <td>
        <div class="linea">
          <p class="nombre">{{ mb_strtoupper($docente?->name ?? '—') }}</p>
          <p class="puesto">DOCENTE — {{ mb_strtoupper($carrera?->nombre ?? '—') }}</p>
        </div>
      </td>
      <td>
        <div class="linea">
          <p class="nombre">VO. BO. {{ mb_strtoupper($jefeCarrera?->name ?? '—') }}</p>
          <p class="puesto">JEFE(A) DE CARRERA — {{ mb_strtoupper($carrera?->nombre ?? '—') }}</p>
        </div>
      </td>
    </tr>
  </table>

  <p style="margin-top:10px;font-size:7pt;color:#777;">Generado el {{ now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY') }} — {{ $institucion->nombre_corto }} Sistema Integral de Control Escolar.</p>
</body>
</html>

<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #1a1a1a; padding: 10mm 12mm; text-transform: uppercase; }
  .AZUL { color: #1a3a5c; }
  h2 { text-align:center; font-size:9pt; color:#1a3a5c; margin:8px 0 10px; }
  table.info { width:100%; border-collapse:collapse; margin-bottom:10px; font-size:9pt; }
  table.info td { padding:3px 5px; }
  table.info .lbl { font-weight:bold; width:110px; color:#444; }
  table.info tr:nth-child(odd) { background:#f5f7fa; }
  table.lista { width:100%; border-collapse:collapse; font-size:9pt; table-layout:fixed; }
  table.lista th { background:#1a3a5c; color:#fff; padding:4px 2px; text-align:center; }
  table.lista td { padding:4px 2px; border-bottom:1px solid #e0e0e0; text-align:center; height:20px; }
  table.lista td.nombre { text-align:left; }
</style>
</head>
<body>
  <h2>Lista de Asistencia</h2>
  <table class="info">
    <tr><td class="lbl">Carrera:</td><td>{{ $carrera?->nombre ?? '—' }}</td><td class="lbl">Periodo:</td><td>{{ $periodo?->nombre ?? '—' }}</td></tr>
    <tr><td class="lbl">Materia:</td><td>{{ $materia?->nombre ?? '—' }}</td><td class="lbl">Clave:</td><td>{{ $materia?->clave ?? '—' }}</td></tr>
    <tr><td class="lbl">Docente:</td><td>{{ $docente?->name ?? '—' }}</td><td class="lbl">Grupo(s):</td><td>{{ $gruposClave }}</td></tr>
  </table>

  <table class="lista">
    <thead>
      <tr>
        <th style="width:4%;">#</th>
        <th style="width:13%;">N° Control</th>
        <th style="width:43%;">Nombre del alumno</th>
        @for($i = 1; $i <= 10; $i++)
          <th style="width:4%;">{{ $i }}</th>
        @endfor
      </tr>
    </thead>
    <tbody>
      @foreach($alumnos as $i => $alumno)
        <tr>
          <td>{{ $i + 1 }}</td>
          <td>{{ $alumno->numero_control }}</td>
          <td class="nombre">{{ $alumno->nombre_completo ?? '—' }}</td>
          @for($i2 = 1; $i2 <= 10; $i2++)
            <td></td>
          @endfor
        </tr>
      @endforeach
    </tbody>
  </table>

  <p style="margin-top:10px;font-size:9pt;color:#777;">Generado el {{ now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY') }} — ITSMT Sistema Integral de Control Escolar.</p>
</body>
</html>

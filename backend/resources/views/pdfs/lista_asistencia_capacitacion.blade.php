<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 9pt; margin: 20px; }
    h1 { font-size: 12pt; text-align: center; }
    h2 { font-size: 10pt; text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #555; padding: 3px 5px; font-size: 8pt; }
    th { background: #dce6f1; font-weight: bold; text-align: center; }
    td.nombre { text-align: left; }
  </style>
</head>
<body>
  <h1>Lista de Asistencia — Capacitación (TecNM-AC-PO-005-06)</h1>
  <h2>{{ $curso->nombre }}</h2>
  <p>
    <strong>Tipo:</strong> {{ ucfirst(str_replace('_', ' ', $curso->tipo)) }} |
    <strong>Modalidad:</strong> {{ ucfirst($curso->modalidad) }} |
    <strong>Horas:</strong> {{ $curso->horas_totales }} |
    <strong>Instructor:</strong> {{ $curso->instructor }} |
    <strong>Jefe Depto.:</strong> {{ $curso->jefeDepto?->name }}
  </p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nombre</th>
        @foreach($fechas as $fecha)
          <th>{{ \Carbon\Carbon::parse($fecha)->format('d/m') }}</th>
        @endforeach
        <th>Total Asist.</th>
      </tr>
    </thead>
    <tbody>
      @foreach($cedulas as $i => $cedula)
      <tr>
        <td style="text-align:center">{{ $i + 1 }}</td>
        <td class="nombre">{{ $cedula->usuario?->name ?? '—' }}</td>
        @foreach($fechas as $fecha)
          @php
            $reg = $cedula->asistencias->firstWhere('fecha', $fecha);
            $val = $reg ? ($reg->presente ? 'P' : 'F') : '';
          @endphp
          <td style="text-align:center">{{ $val }}</td>
        @endforeach
        <td style="text-align:center">{{ $cedula->num_asistencias }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>
  <p style="margin-top:20px;font-size:8pt;">P = Presente &nbsp; F = Falta</p>
</body>
</html>

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 9pt; margin: 20px; }
    h1 { font-size: 12pt; text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #555; padding: 4px 6px; font-size: 8pt; }
    th { background: #dce6f1; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Registro General de Capacitación (TecNM-AC-PO-005-13)</h1>
  <p style="text-align:right"><strong>Fecha:</strong> {{ $fecha }}</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nombre del Curso</th>
        <th>Tipo</th>
        <th>Modalidad</th>
        <th>Horas</th>
        <th>Inicio</th>
        <th>Fin</th>
        <th>Jefe Depto.</th>
        <th>Estatus</th>
        <th>Inscritos</th>
        <th>Acreditados</th>
      </tr>
    </thead>
    <tbody>
      @foreach($cursos as $i => $curso)
      @php
        $inscritos   = $curso->cedulas->count();
        $acreditados = $curso->cedulas->whereIn('estatus', ['acreditado'])->count();
      @endphp
      <tr>
        <td style="text-align:center">{{ $i + 1 }}</td>
        <td>{{ $curso->nombre }}</td>
        <td>{{ ucfirst(str_replace('_', ' ', $curso->tipo)) }}</td>
        <td>{{ ucfirst($curso->modalidad) }}</td>
        <td style="text-align:center">{{ $curso->horas_totales }}</td>
        <td>{{ $curso->periodo_inicio }}</td>
        <td>{{ $curso->periodo_fin }}</td>
        <td>{{ $curso->jefeDepto?->name ?? '—' }}</td>
        <td>{{ ucfirst($curso->estatus) }}</td>
        <td style="text-align:center">{{ $inscritos }}</td>
        <td style="text-align:center">{{ $acreditados }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>
</body>
</html>

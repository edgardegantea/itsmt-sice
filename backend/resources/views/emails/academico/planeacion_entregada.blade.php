<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Planeación Didáctica Entregada</title></head>
<body style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#1a3a5c;padding:20px;border-radius:6px 6px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">Planeación Didáctica Entregada</h2>
  </div>
  <div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 6px 6px">
    <p>Se ha recibido una planeación didáctica para tu revisión:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr>
        <td style="padding:6px 12px;background:#f5f7fa;font-weight:bold;width:35%">Docente</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">{{ $planeacion->docente?->name ?? '—' }}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;background:#f5f7fa;font-weight:bold">Asignatura</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">{{ $planeacion->cargaAcademica?->materia?->nombre ?? '—' }}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;background:#f5f7fa;font-weight:bold">Grupo</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">{{ $planeacion->cargaAcademica?->grupo?->nombre ?? '—' }}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;background:#f5f7fa;font-weight:bold">Periodo</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">{{ $planeacion->periodo?->nombre ?? '—' }}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;background:#f5f7fa;font-weight:bold">Fecha entrega</td>
        <td style="padding:6px 12px">{{ $planeacion->fecha_entrega ? \Carbon\Carbon::parse($planeacion->fecha_entrega)->format('d/m/Y') : now()->format('d/m/Y') }}</td>
      </tr>
    </table>
    <p style="color:#555;font-size:13px">Ingresa al sistema para revisar y actualizar el estatus de la planeación (revisada / liberada / devuelta).</p>
  </div>
</body>
</html>

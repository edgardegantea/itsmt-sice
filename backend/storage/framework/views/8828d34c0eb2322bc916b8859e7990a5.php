<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; font-size:9pt; color:#1a1a1a; }
.header { text-align:center; border-bottom:2px solid #1a3a5c; padding-bottom:8px; margin-bottom:12px; }
.header h1 { font-size:12pt; color:#1a3a5c; }
.header h2 { font-size:10pt; }
table { width:100%; border-collapse:collapse; margin-bottom:16px; }
th { background:#1a3a5c; color:#fff; padding:5px 6px; font-size:8pt; text-align:left; }
td { padding:4px 6px; border-bottom:1px solid #ddd; font-size:8pt; }
tr:nth-child(even) td { background:#f0f4f8; }
.section-title { background:#e8eef5; padding:4px 6px; font-weight:bold; font-size:9pt; margin:10px 0 4px; border-left:4px solid #1a3a5c; }
.totals { margin-top:8px; font-size:9pt; }
.totals td { border:none; padding:2px 6px; }
</style>
</head>
<body>
<div class="header">
  <h1>INSTITUTO TECNOLÓGICO SUPERIOR DE MISANTLA</h1>
  <h2>REPORTE INTEGRAL DE MATRÍCULA</h2>
  <p>Periodo: <?php echo e($periodo?->nombre ?? 'Todos los periodos'); ?> &nbsp;|&nbsp; Generado: <?php echo e(now()->format('d/m/Y H:i')); ?></p>
</div>

<div class="section-title">INSCRITOS NUEVOS (<?php echo e($inscritos->count()); ?>)</div>
<table>
  <thead>
    <tr>
      <th>#</th><th>Número de Control</th><th>Nombre</th><th>Carrera</th><th>Semestre</th><th>Tipo Ingreso</th>
    </tr>
  </thead>
  <tbody>
    <?php $__empty_1 = true; $__currentLoopData = $inscritos; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $i => $alumno): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
    <tr>
      <td><?php echo e($i + 1); ?></td>
      <td><?php echo e($alumno->numero_control ?? '—'); ?></td>
      <td><?php echo e($alumno->user?->nombre_completo ?? '—'); ?></td>
      <td><?php echo e($alumno->carrera?->nombre ?? '—'); ?></td>
      <td><?php echo e($alumno->semestre_actual ?? '—'); ?></td>
      <td><?php echo e($alumno->inscripcion?->tipo_ingreso ?? '—'); ?></td>
    </tr>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
    <tr><td colspan="6" style="text-align:center;">Sin registros</td></tr>
    <?php endif; ?>
  </tbody>
</table>

<div class="section-title">REINSCRIPCIONES APROBADAS (<?php echo e($reinscripciones->count()); ?>)</div>
<table>
  <thead>
    <tr><th>#</th><th>Número de Control</th><th>Nombre</th><th>Carrera</th></tr>
  </thead>
  <tbody>
    <?php $__empty_1 = true; $__currentLoopData = $reinscripciones; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $i => $r): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
    <tr>
      <td><?php echo e($i + 1); ?></td>
      <td><?php echo e($r->alumno?->numero_control ?? '—'); ?></td>
      <td><?php echo e($r->alumno?->user?->nombre_completo ?? '—'); ?></td>
      <td><?php echo e($r->alumno?->carrera?->nombre ?? '—'); ?></td>
    </tr>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
    <tr><td colspan="4" style="text-align:center;">Sin registros</td></tr>
    <?php endif; ?>
  </tbody>
</table>

<div class="section-title">BAJAS (<?php echo e($bajas->count()); ?>)</div>
<table>
  <thead>
    <tr><th>#</th><th>Número de Control</th><th>Nombre</th><th>Carrera</th><th>Tipo Baja</th><th>Fecha</th></tr>
  </thead>
  <tbody>
    <?php $__empty_1 = true; $__currentLoopData = $bajas; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $i => $b): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
    <tr>
      <td><?php echo e($i + 1); ?></td>
      <td><?php echo e($b->alumno?->numero_control ?? '—'); ?></td>
      <td><?php echo e($b->alumno?->user?->nombre_completo ?? '—'); ?></td>
      <td><?php echo e($b->alumno?->carrera?->nombre ?? '—'); ?></td>
      <td><?php echo e($b->tipo_baja ?? '—'); ?></td>
      <td><?php echo e($b->fecha_solicitud?->format('d/m/Y') ?? '—'); ?></td>
    </tr>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
    <tr><td colspan="6" style="text-align:center;">Sin registros</td></tr>
    <?php endif; ?>
  </tbody>
</table>

<table class="totals">
  <tr>
    <td><strong>Total inscritos nuevos:</strong> <?php echo e($inscritos->count()); ?></td>
    <td><strong>Total reinscripciones:</strong> <?php echo e($reinscripciones->count()); ?></td>
    <td><strong>Total bajas:</strong> <?php echo e($bajas->count()); ?></td>
  </tr>
</table>
</body>
</html>
<?php /**PATH C:\Users\edgar\development\itsmt-sice\itsmt-sice\backend\resources\views/pdfs/reporte_matricula.blade.php ENDPATH**/ ?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; font-size:8pt; color:#1a1a1a; }
.header { text-align:center; border-bottom:2px solid #1a3a5c; padding-bottom:8px; margin-bottom:12px; }
.header h1 { font-size:11pt; color:#1a3a5c; }
table { width:100%; border-collapse:collapse; }
th { background:#1a3a5c; color:#fff; padding:4px 6px; font-size:8pt; text-align:left; }
td { padding:3px 6px; border-bottom:1px solid #ddd; font-size:7.5pt; }
tr:nth-child(even) td { background:#f0f4f8; }
</style>
</head>
<body>
<div class="header">
  <h1>INSTITUTO TECNOLÓGICO SUPERIOR DE MISANTLA</h1>
  <h2>DIRECTORIO DE PERSONAL DOCENTE</h2>
  <p>Total: <?php echo e($datos->count()); ?> docentes &nbsp;|&nbsp; Generado: <?php echo e(now()->format('d/m/Y')); ?></p>
</div>
<table>
  <thead>
    <tr>
      <th>#</th><th>Nombre Completo</th><th>Especialidad</th>
      <th>Tipo Contrato</th><th>Correo</th>
    </tr>
  </thead>
  <tbody>
    <?php $__currentLoopData = $datos; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $i => $docente): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <tr>
      <td><?php echo e($i + 1); ?></td>
      <td><?php echo e($docente->nombre_completo ?? '—'); ?></td>
      <td><?php echo e($docente->fichaDocente?->categoria ?? '—'); ?></td>
      <td><?php echo e($docente->fichaDocente?->tipo_contrato ?? '—'); ?></td>
      <td><?php echo e($docente->email ?? '—'); ?></td>
    </tr>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
  </tbody>
</table>
</body>
</html>
<?php /**PATH C:\Users\edgar\development\itsmt-sice\itsmt-sice\backend\resources\views/pdfs/directorio_docentes.blade.php ENDPATH**/ ?>
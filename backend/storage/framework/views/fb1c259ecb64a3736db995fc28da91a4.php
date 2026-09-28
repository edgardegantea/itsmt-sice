<?php
    // Réplica del formato del SGC "Instrumentación Didáctica para la formación y desarrollo de
    // competencias profesionales-Ingreso Agosto 2015 del SGI del G4": carta horizontal, Arial
    // 12/11 pt, márgenes 2.5 cm (izq./sup.) y 2 cm (der./inf.), encabezado en cada página.
    // Pasa por revisión del SGC: textos, numeración (1), (4.1)… y disposición deben coincidir
    // con el original. Los datos llegan de PlaneacionDocenteController::datosInstrumentacion().
    // $motor: 'chromium' (Gotenberg, encabezado como header.html y márgenes por parámetro)
    // o 'dompdf' (respaldo, encabezado como bloque fijo y márgenes con @page).
    $motor ??= 'dompdf';

    // HTML del editor enriquecido, sanitizado (el array `competencias` no tiene validación
    // de esquema; sin esto se podría inyectar HTML/CSS arbitrario en el PDF).
    $html = fn ($v) => \App\Support\RichText::aHtmlSeguro($v);
    $semanas = count($d['tp']);
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Instrumentación Didáctica</title>
<style>
    <?php if($motor === 'dompdf'): ?> @page { margin: 106pt 57pt 57pt 71pt; } <?php endif; ?>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #000; line-height: 1.15; }
    p { margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    .t td, .t th { border: 0.6pt solid #000; padding: 2pt 4pt; vertical-align: top; font-size: 11pt; font-weight: normal; }
    .t th { text-align: center; vertical-align: middle; }
    .c { text-align: center; vertical-align: middle; }
    .b { font-weight: bold; }
    .titulo-sec { font-weight: bold; margin: 12pt 0 3pt; }
    .etiqueta { margin: 12pt 0 3pt 6pt; }
    .caja { border: 0.6pt solid #000; min-height: 62pt; padding: 4pt 6pt; }
    .campo { border-bottom: 0.6pt solid #000; display: inline-block; }
    .salto { page-break-before: always; }
    .rico p { margin: 0 0 3pt; }
    .rico ul, .rico ol { margin: 0 0 3pt 14pt; padding: 0; }
    /* Las filas con actividades largas se parten entre páginas, igual que en Word. */
    tr { page-break-inside: auto; }
    thead { display: table-header-group; }

    /* Encabezado del formato, repetido en cada página (distancia del encabezado: 1 cm) */
    #encabezado { position: fixed; top: -78pt; left: 0; right: 0; }

    .semanas td, .semanas th { font-size: 11pt; padding: 1pt 1pt; }
    .leyenda td { font-size: 11pt; text-align: center; padding: 1pt 0; }
    .firmas td { text-align: center; vertical-align: bottom; font-size: 12pt; }
</style>
</head>
<body>

<?php if($motor === 'dompdf'): ?>
<div id="encabezado">
    <?php echo $__env->make('pdfs.partials.instrumentacion_encabezado', ['logoTec' => $d['logo_tec'], 'logoInst' => $d['logo_inst']], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
</div>
<?php endif; ?>


<p class="b" style="text-align:center; margin-top:30pt;">Instrumentación didáctica para la formación y desarrollo de competencias profesionales</p>
<p class="b" style="text-align:center;">Periodo <span class="campo" style="min-width:130pt; font-weight:normal;"><?php echo e($d['periodo']); ?></span></p>

<table style="width:auto; margin:30pt 0 0 132pt; font-size:12pt;">
    <tr><td style="padding:0 4pt 0 0;">Nombre de la asignatura:</td><td style="padding:0;"><span class="campo" style="width:260pt;"><?php echo e($d['asignatura']); ?></span></td></tr>
    <tr><td style="padding:0 4pt 0 0;">Plan de estudios:</td><td style="padding:0;"><span class="campo" style="width:260pt;"><?php echo e($d['plan']); ?></span></td></tr>
    <tr><td style="padding:0 4pt 0 0;">Clave de la asignatura:</td><td style="padding:0;"><span class="campo" style="width:260pt;"><?php echo e($d['clave']); ?></span></td></tr>
    <tr><td style="padding:0 4pt 0 0;">Horas teoría-Horas práctica-Créditos:</td><td style="padding:0;"><span class="campo" style="width:260pt;"><?php echo e($d['horas']); ?></span></td></tr>
</table>

<p class="titulo-sec" style="margin-top:3pt;">1. Caracterización de la asignatura&nbsp; (1)</p>
<div class="caja rico"><?php echo $html($d['caracterizacion']); ?></div>

<p class="titulo-sec">2. Intención didáctica&nbsp; (2)</p>
<div class="caja rico"><?php echo $html($d['intencion']); ?></div>

<p class="titulo-sec">3. Competencia de la asignatura&nbsp; (3)</p>
<div class="caja rico"><?php echo $html($d['competencia']); ?></div>


<?php $__currentLoopData = $d['competencias']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $comp): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <?php
        $letras = $comp['letras'] ?: ['A', 'B', 'C', '…', 'N'];
        $filas = $comp['filas'] ?: [['subtemas' => [], 'aprendizaje' => '', 'ensenanza' => '', 'horas' => '']];
    ?>
    <p class="titulo-sec salto">4. Análisis por competencias especificas</p>
    <table style="margin-bottom:10pt;">
        <tr>
            <td style="width:48%; vertical-align:top; padding:0 12pt 0 6pt;">
                Competencia No. (4.1) <span class="campo" style="width:170pt; text-align:center;"><?php echo e($comp['numero']); ?></span>
            </td>
            <td style="vertical-align:top; padding:0;">
                Descripción: (4.2)
                <div class="campo rico" style="display:block; margin-top:2pt;">
                    <?php if($comp['nombre'] !== ''): ?><strong><?php echo e($comp['nombre']); ?>.</strong> <?php endif; ?><?php echo $html($comp['descripcion']); ?>

                </div>
            </td>
        </tr>
    </table>

    <table class="t">
        <thead>
            <tr>
                <th style="width:24%;">Temas y Subtemas para desarrollar la competencia especifica (4.3)</th>
                <th style="width:20%;">Actividades de aprendizaje (4.4)</th>
                <th style="width:20%;">Actividades de enseñanza (4.5)</th>
                <th style="width:20%;">Desarrollo de competencias genéricas (4.6)</th>
                <th style="width:16%;">Horas teórico-prácticas (4.7)</th>
            </tr>
        </thead>
        <tbody>
            <?php $__currentLoopData = $filas; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $f): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <tr>
                <td><?php $__currentLoopData = $f['subtemas']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $s): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><?php echo e($s); ?><?php if(!$loop->last): ?><br><?php endif; ?> <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></td>
                <td class="rico"><?php echo $html($f['aprendizaje']); ?></td>
                <td class="rico"><?php echo $html($f['ensenanza']); ?></td>
                <td><?php if($loop->first): ?><?php $__currentLoopData = $comp['genericas']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $g): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><?php echo e($g); ?><?php if(!$loop->last): ?><br><?php endif; ?> <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?> <?php endif; ?></td>
                <td class="c"><?php echo e($f['horas']); ?></td>
            </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </tbody>
    </table>

    <table class="t" style="margin-top:14pt;">
        <tr>
            <td style="width:55%; font-size:12pt;">Indicadores de alcance&nbsp; (4.8)</td>
            <td style="font-size:12pt;">Valor del indicador&nbsp; (4.9)</td>
        </tr>
        <tr>
            <td style="font-size:10pt;">
                <?php $__empty_1 = true; $__currentLoopData = $comp['indicadores']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $ind): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?><?php echo e($ind['letra']); ?>. <?php echo e($ind['indicador']); ?><?php if(!$loop->last): ?><br><?php endif; ?>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?> A.<br>B.<br>C.<br>…<br>N.
                <?php endif; ?>
            </td>
            <td style="font-size:10pt;">
                <?php $__currentLoopData = $comp['indicadores']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $ind): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><?php echo e($ind['letra']); ?>. <?php echo e($ind['valor']); ?><?php if(!$loop->last): ?><br><?php endif; ?> <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </td>
        </tr>
    </table>

    <p class="etiqueta">Niveles de desempeño&nbsp; (4.10)</p>
    <table class="t">
        <tr>
            <th style="width:22%; font-size:12pt;">Desempeño</th>
            <th style="width:20%; font-size:12pt;">Nivel de desempeño</th>
            <th style="font-size:12pt;">Indicadores de alcance</th>
            <th style="width:20%; font-size:12pt;">Valoración numérica</th>
        </tr>
        <?php $__currentLoopData = $comp['niveles']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $niv): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <tr>
            <?php if($loop->first): ?>
                <td class="c" rowspan="4" style="font-size:12pt;">Competencia alcanzada</td>
            <?php elseif($niv['nivel'] === 'Insuficiente'): ?>
                <td class="c" style="font-size:12pt;">Competencia no alcanzada</td>
            <?php endif; ?>
            <td style="font-size:12pt;"><?php echo e($niv['nivel']); ?></td>
            <td><?php echo e($niv['indicadores']); ?></td>
            <td class="c"><?php echo e($niv['valoracion']); ?></td>
        </tr>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </table>

    <p class="etiqueta">Matriz de evaluación&nbsp; (4.11)</p>
    <table class="t">
        <tr>
            <th rowspan="2" style="width:26%; font-size:12pt;">Evidencia de aprendizaje</th>
            <th rowspan="2" style="width:12%; font-size:12pt;">%</th>
            <th colspan="<?php echo e(count($letras)); ?>" style="font-size:12pt;">Indicador de alcance</th>
            <th rowspan="2" style="font-size:12pt;">Evaluación formativa de la competencia</th>
        </tr>
        <tr><?php $__currentLoopData = $letras; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $l): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><th style="width:3.8%; font-size:12pt;"><?php echo e($l); ?></th><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></tr>
        <?php $__empty_1 = true; $__currentLoopData = $comp['matriz']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $f): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
        <tr>
            <td><?php echo e($f['evidencia']); ?></td>
            <td class="c"><?php echo e($f['porcentaje']); ?></td>
            <?php $__currentLoopData = $letras; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $k => $l): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><td class="c"><?php echo e(!empty($f['marcas'][$k]) ? 'X' : ''); ?></td><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            <td><?php echo e($f['formativa']); ?></td>
        </tr>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
        <tr><td>&nbsp;</td><td></td><?php $__currentLoopData = $letras; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $l): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><td></td><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?><td></td></tr>
        <tr><td>&nbsp;</td><td></td><?php $__currentLoopData = $letras; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $l): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><td></td><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?><td></td></tr>
        <?php endif; ?>
        <tr>
            <td></td>
            <td class="c" style="font-size:12pt;">Total <?php if($comp['matriz']): ?><?php echo e(rtrim(rtrim(number_format($comp['total_pct'], 2, '.', ''), '0'), '.')); ?><?php endif; ?></td>
            <?php if($comp['indicadores']): ?>
                <?php $__currentLoopData = $comp['indicadores']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $ind): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><td class="c"><?php echo e($ind['valor']); ?></td><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            <?php else: ?>
                <?php $__currentLoopData = $letras; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $l): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><td></td><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            <?php endif; ?>
            <td></td>
        </tr>
    </table>
    <p style="font-size:11.5pt; margin-top:10pt;"><strong>Nota:</strong> este apartado número 4 de la instrumentación didáctica para la formación y desarrollo de competencias profesionales se repite, de acuerdo al número de competencias específicas de los temas de asignatura.</p>
<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>


<p class="titulo-sec" style="margin-top:28pt;">5. Fuentes de información y apoyos didácticos</p>
<table style="margin-top:22pt;">
    <tr>
        <td style="width:50%; padding:0 0 3pt 0;">Fuentes de información: (5.1)</td>
        <td style="padding:0 0 3pt 0;">Apoyos didácticos: (5.2)</td>
    </tr>
</table>
<table class="t">
    <tr>
        <td style="width:50%; height:90pt;"><?php $__currentLoopData = $d['fuentes']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $f): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><?php echo e($loop->iteration); ?>. <?php echo e($f); ?><?php if(!$loop->last): ?><br><?php endif; ?> <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></td>
        <td><?php $__currentLoopData = $d['apoyos']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $a): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><?php echo e($a); ?><?php if(!$loop->last): ?><br><?php endif; ?> <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></td>
    </tr>
</table>


<p class="titulo-sec" style="margin-top:22pt;">6. Calendarización de evaluación en semanas: (6)</p>
<table class="t semanas" style="table-layout:fixed;">
    <tr>
        <td class="c" style="width:8%;">Semana</td>
        <?php $__currentLoopData = array_keys($d['tp']); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $s): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <?php if($s === $semanas): ?>
                <td class="c" style="width:7%;"><?php echo e($s); ?><br><span style="font-size:8pt;">Segunda oportunidad</span></td>
            <?php else: ?>
                <td class="c"><?php echo e($s); ?></td>
            <?php endif; ?>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </tr>
    <?php $__currentLoopData = ['TP' => $d['tp'], 'TR' => [], 'SD' => []]; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $fila => $valores): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <tr>
        <td class="c"><?php echo e($fila); ?></td>
        <?php $__currentLoopData = array_keys($d['tp']); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $s): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><td class="c" style="font-size:9pt;"><?php echo e($valores[$s] ?? ''); ?></td><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </tr>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
</table>
<table class="leyenda" style="margin-top:14pt;">
    <tr><td style="width:33%;">TP= tiempo planeado</td><td style="width:34%;">TR = tiempo real</td><td>SD = seguimiento departamental</td></tr>
    <tr><td>ED = Evaluación Diagnóstica</td><td>EFn = Evaluación Formativa (competencia especifica n)</td><td>ES = Evaluación Sumativa</td></tr>
</table>

<p style="text-align:right; margin-top:40pt;">Fecha de elaboración: <span class="campo" style="width:120pt; text-align:center;"><?php echo e($d['fecha']); ?></span></p>


<table class="firmas" style="margin-top:70pt; page-break-inside:avoid;">
    <tr>
        <td style="width:38%; border-bottom:0.6pt solid #000; height:16pt;"><?php echo e($d['docente']); ?></td>
        <td style="width:6%;"></td>
        <td style="border-bottom:0.6pt solid #000;"><?php echo e($d['jefe']); ?></td>
    </tr>
    <tr>
        <td style="padding-top:2pt;">Nombre y firma del(de la) profesor(a)</td>
        <td></td>
        <td style="padding-top:2pt;">Nombre y firma del(de la) Jefe(a) de Departamento Académico</td>
    </tr>
</table>

</body>
</html>
<?php /**PATH C:\Users\edgar\development\itsmt-sice\itsmt-sice\backend\resources\views/pdfs/planeacion_instrumentacion.blade.php ENDPATH**/ ?>
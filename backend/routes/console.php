<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Sprint 20 — Cierre automático de convocatorias al vencer fecha_limite
Schedule::command('convocatorias:cerrar')->dailyAt('01:00');

// Recordatorio por correo al docente ~10 minutos antes de cada clase
Schedule::command('asistencia:enviar-recordatorios')->everyMinute();

// Recordatorio de captura de calificaciones pendiente (una vez por alerta, no diario)
Schedule::command('calificaciones:enviar-recordatorios-captura')->dailyAt('08:00');

// Recordatorio al docente cuando inicia la semana de holgura para evaluar y cargar
// calificaciones de una unidad (calculado de su propia dosificación, un solo correo
// por unidad — ver EnviarRecordatorioEvaluacionCommand)
Schedule::command('planeaciones:enviar-recordatorio-evaluacion')->dailyAt('07:30');

// Resumen semanal de asistencia por docente
Schedule::command('asistencia:enviar-resumen-semanal')->weeklyOn(5, '17:00'); // viernes 17:00

// Snapshot semanal del índice de salud por carrera (para poder mostrar tendencia)
Schedule::command('academico:snapshot-salud-semestral')->weeklyOn(1, '06:00'); // lunes 06:00

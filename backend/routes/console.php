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

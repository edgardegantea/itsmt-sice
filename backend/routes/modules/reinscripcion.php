<?php

use Illuminate\Support\Facades\Route;

// Rutas del modulo Reinscripcion - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/calendario-escolar/{periodoId}',                              [\App\Http\Controllers\Reinscripcion\CalendarioEscolarController::class, 'show']);
    Route::post('/calendario-escolar',                                         [\App\Http\Controllers\Reinscripcion\CalendarioEscolarController::class, 'store']);
    Route::patch('/calendario-escolar/{calendario}/autorizar',                 [\App\Http\Controllers\Reinscripcion\CalendarioEscolarController::class, 'autorizar']);

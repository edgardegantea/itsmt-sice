<?php

use Illuminate\Support\Facades\Route;

// Rutas del modulo Becas - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/solicitudes-beca',                                            [\App\Http\Controllers\Becas\SolicitudBecaController::class, 'index']);
    Route::post('/solicitudes-beca',                                           [\App\Http\Controllers\Becas\SolicitudBecaController::class, 'store']);
    Route::patch('/solicitudes-beca/{solicitud}/validar',                      [\App\Http\Controllers\Becas\SolicitudBecaController::class, 'validar']);
    Route::post('/solicitudes-beca/{solicitud}/asignar',                       [\App\Http\Controllers\Becas\SolicitudBecaController::class, 'asignar']);
    Route::get('/becas/padron/{periodoId}',                                    [\App\Http\Controllers\Becas\SolicitudBecaController::class, 'padron']);
    Route::patch('/becas/{beca}/cancelar',                                     [\App\Http\Controllers\Becas\SolicitudBecaController::class, 'cancelar']);
    Route::get('/alumnos/{alumno}/historial-becas',                            [\App\Http\Controllers\Becas\SolicitudBecaController::class, 'historialAlumno']);

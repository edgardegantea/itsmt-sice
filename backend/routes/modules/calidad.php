<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Calidad\ActividadComplementariaController;
use App\Http\Controllers\Calidad\EvaluacionDocenteController;
use App\Http\Controllers\Calidad\TipoActividadController;

// Rutas del modulo Calidad - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/tipos-actividad',                                         [TipoActividadController::class, 'index']);
    Route::get('/actividades-complementarias',                             [ActividadComplementariaController::class, 'index']);
    Route::post('/actividades-complementarias',                            [ActividadComplementariaController::class, 'store']);
    Route::post('/actividades-complementarias/{actividad}/evidencia',      [ActividadComplementariaController::class, 'subirEvidencia']);
    Route::patch('/actividades-complementarias/{actividad}/validar',       [ActividadComplementariaController::class, 'validar']);
    Route::delete('/actividades-complementarias/{actividad}',              [ActividadComplementariaController::class, 'destroy']);
    Route::get('/evaluaciones-docentes/resultados',                        [EvaluacionDocenteController::class, 'resultados']);
    Route::get('/evaluaciones-docentes',                                   [EvaluacionDocenteController::class, 'index']);
    Route::post('/evaluaciones-docentes',                                  [EvaluacionDocenteController::class, 'store']);
    Route::get('/autoevaluaciones-docente',                                [\App\Http\Controllers\Calidad\EvaluacionDocenteAmpliadaController::class, 'autoevaluaciones']);
    Route::get('/evaluaciones-area-docente',                               [\App\Http\Controllers\Calidad\EvaluacionDocenteAmpliadaController::class, 'evaluacionesArea']);
    Route::get('/planes-mejora-docente',                                   [\App\Http\Controllers\Calidad\EvaluacionDocenteAmpliadaController::class, 'planesMejora']);
    Route::get('/evidencias-calidad',                                          [\App\Http\Controllers\Calidad\EvidenciaCalidadController::class, 'index']);
    Route::post('/evidencias-calidad',                                         [\App\Http\Controllers\Calidad\EvidenciaCalidadController::class, 'store']);
    Route::patch('/evidencias-calidad/{evidencia}/validar',                    [\App\Http\Controllers\Calidad\EvidenciaCalidadController::class, 'validar']);
    Route::get('/no-conformidades',                                            [\App\Http\Controllers\Calidad\EvidenciaCalidadController::class, 'noConformidades']);
    Route::post('/no-conformidades',                                           [\App\Http\Controllers\Calidad\EvidenciaCalidadController::class, 'crearNoConformidad']);
    Route::post('/no-conformidades/{nc}/acciones',                             [\App\Http\Controllers\Calidad\EvidenciaCalidadController::class, 'agregarAccion']);
    Route::patch('/no-conformidades/{nc}/cerrar',                              [\App\Http\Controllers\Calidad\EvidenciaCalidadController::class, 'cerrarNoConformidad']);
    Route::get('/indicadores/calidad/{periodoId}',                             [\App\Http\Controllers\Calidad\EvidenciaCalidadController::class, 'indicadores']);

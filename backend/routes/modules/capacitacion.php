<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Capacitacion\AsistenciaCapacitacionController;
use App\Http\Controllers\Capacitacion\CursoCapacitacionController;
use App\Http\Controllers\Capacitacion\EvaluacionSeguimientoCapController;

// Rutas del modulo Capacitacion - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/cursos-capacitacion',                                           [CursoCapacitacionController::class, 'index']);
    Route::post('/cursos-capacitacion',                                          [CursoCapacitacionController::class, 'store']);
    Route::patch('/cursos-capacitacion/{cursoCapacitacion}',                     [CursoCapacitacionController::class, 'update']);
    Route::get('/cursos-capacitacion/{cursoCapacitacion}/inscripciones',         [CursoCapacitacionController::class, 'inscripciones']);
    Route::post('/cursos-capacitacion/{cursoCapacitacion}/inscripciones',        [CursoCapacitacionController::class, 'inscribir']);
    Route::get('/cursos-capacitacion/{cursoCapacitacion}/lista-asistencia/pdf',  [AsistenciaCapacitacionController::class, 'listaAsistenciaPdf']);
    Route::get('/cedulas-inscripcion/{cedulaInscripcion}/pdf',                   [CursoCapacitacionController::class, 'cedulaPdf']);
    Route::get('/asistencias-capacitacion',  [AsistenciaCapacitacionController::class, 'index']);
    Route::post('/asistencias-capacitacion', [AsistenciaCapacitacionController::class, 'store']);
    Route::get('/evaluaciones-seguimiento-capacitacion',  [EvaluacionSeguimientoCapController::class, 'index']);
    Route::post('/evaluaciones-seguimiento-capacitacion', [EvaluacionSeguimientoCapController::class, 'store']);
    Route::get('/registro-general-capacitacion',          [AsistenciaCapacitacionController::class, 'registroGeneral']);
    Route::get('/registro-general-capacitacion/pdf',      [AsistenciaCapacitacionController::class, 'registroGeneralPdf']);

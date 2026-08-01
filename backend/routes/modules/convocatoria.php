<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Convocatoria\ConvocatoriaController;
use App\Http\Controllers\Convocatoria\PostulacionController;

// Rutas del modulo Convocatoria - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/convocatorias',                                               [ConvocatoriaController::class, 'index']);
    Route::post('/convocatorias',                                              [ConvocatoriaController::class, 'store']);
    Route::get('/convocatorias/{convocatoria}',                                [ConvocatoriaController::class, 'show']);
    Route::patch('/convocatorias/{convocatoria}/estatus',                      [ConvocatoriaController::class, 'updateEstatus']);
    Route::post('/convocatorias/{convocatoria}/publicar-resultados',           [ConvocatoriaController::class, 'publicarResultados']);
    Route::get('/convocatorias/{convocatoria}/postulaciones',                  [PostulacionController::class, 'indexPorConvocatoria']);
    Route::post('/convocatorias/{convocatoria}/postulaciones',                 [PostulacionController::class, 'store']);
    Route::patch('/postulaciones/{postulacion}/estatus',                       [PostulacionController::class, 'updateEstatus']);
    Route::get('/users/{user}/postulaciones',                                  [PostulacionController::class, 'misPostulaciones']);

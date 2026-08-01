<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Permanencia\AdeudoController;
use App\Http\Controllers\Permanencia\BajaController;
use App\Http\Controllers\Permanencia\ConstanciaController;
use App\Http\Controllers\Permanencia\EncuestaSocioeconomicaController;
use App\Http\Controllers\Permanencia\ReinscripcionController;

// Rutas del modulo Permanencia - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/reinscripciones',                                        [ReinscripcionController::class, 'index']);
    Route::post('/reinscripciones',                                       [ReinscripcionController::class, 'store']);
    Route::patch('/reinscripciones/{reinscripcion}/estatus',              [ReinscripcionController::class, 'actualizarEstatus']);
    Route::patch('/reinscripciones/{reinscripcion}/resello-credencial',   [ReinscripcionController::class, 'registrarResello']);
    Route::post('/orden-reinscripcion',                                   [ReinscripcionController::class, 'publicarOrden']);
    Route::get('/orden-reinscripcion/{periodo_id}',                       [ReinscripcionController::class, 'consultarOrden']);
    Route::get('/adeudos',                                                [AdeudoController::class, 'index']);
    Route::post('/adeudos',                                               [AdeudoController::class, 'store']);
    Route::patch('/adeudos/{adeudo}/pagar',                               [AdeudoController::class, 'marcarPagado']);
    Route::delete('/adeudos/{adeudo}',                                    [AdeudoController::class, 'destroy']);
    Route::get('/alumnos/{alumno}/adeudos',                               [ReinscripcionController::class, 'adeudos']);
    Route::get('/bajas',                                                  [BajaController::class, 'index']);
    Route::post('/bajas',                                                 [BajaController::class, 'store']);
    Route::post('/bajas/solicitar',                                       [BajaController::class, 'solicitar']);
    Route::get('/bajas/mias',                                             [BajaController::class, 'mias']);
    Route::patch('/bajas/{baja}/estatus',                                 [BajaController::class, 'actualizarEstatus']);
    Route::patch('/bajas/{baja}/reingreso',                               [BajaController::class, 'registrarReingreso']);
    Route::get('/alumnos/{alumno}/bajas',                                 [BajaController::class, 'porAlumno']);
    Route::get('/constancias',                                            [ConstanciaController::class, 'index']);
    Route::post('/constancias',                                           [ConstanciaController::class, 'store']);
    Route::get('/alumnos/{alumno}/constancias',                           [ConstanciaController::class, 'porAlumno']);
    Route::post('/constancias/{constancia}/emitir',                       [ConstanciaController::class, 'emitir']);
    Route::get('/constancias/{constancia}/pdf',                           [ConstanciaController::class, 'pdf']);
    Route::get('/encuestas-socioeconomicas/mi-encuesta',                  [EncuestaSocioeconomicaController::class, 'miEncuesta']);
    Route::post('/encuestas-socioeconomicas',                             [EncuestaSocioeconomicaController::class, 'guardar']);
    Route::post('/encuestas-socioeconomicas/{encuesta}/enviar',           [EncuestaSocioeconomicaController::class, 'enviar']);
    Route::get('/admin/encuestas-socioeconomicas',                        [EncuestaSocioeconomicaController::class, 'index']);
    Route::get('/admin/encuestas-socioeconomicas/{encuesta}',             [EncuestaSocioeconomicaController::class, 'show']);
    Route::patch('/admin/encuestas-socioeconomicas/{encuesta}',           [EncuestaSocioeconomicaController::class, 'adminUpdate']);

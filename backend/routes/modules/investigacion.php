<?php

use Illuminate\Support\Facades\Route;

// Rutas del modulo Investigacion - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/cuerpos-academicos',                                          [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'index']);
    Route::post('/cuerpos-academicos',                                         [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'store']);
    Route::get('/cuerpos-academicos/{ca}',                                     [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'show']);
    Route::post('/cuerpos-academicos/{ca}/lgac',                               [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'agregarLgac']);
    Route::post('/cuerpos-academicos/{ca}/integrantes',                        [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'agregarIntegrante']);
    Route::patch('/integrantes-ca/{integrante}/baja',                          [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'bajaIntegrante']);
    Route::get('/proyectos-investigacion',                                     [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'proyectos']);
    Route::post('/proyectos-investigacion',                                    [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'storeProyecto']);
    Route::patch('/proyectos-investigacion/{proyecto}/estatus',                [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'actualizarEstatusProyecto']);
    Route::get('/producciones-academicas',                                     [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'producciones']);
    Route::post('/producciones-academicas',                                    [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'storeProduccion']);
    Route::patch('/producciones-academicas/{produccion}/validar',              [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'validarProduccion']);
    Route::get('/indicadores/investigacion',                                   [\App\Http\Controllers\Investigacion\CuerpoAcademicoController::class, 'indicadores']);

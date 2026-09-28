<?php

use App\Http\Controllers\Comunicacion\ComunicadoController;
use Illuminate\Support\Facades\Route;

// Módulo de Comunicación Interna e Información Institucional
// Se registra dentro del middleware 'auth:sanctum' en routes/api.php

Route::prefix('comunicados')->group(function () {
    Route::get('/',                           [ComunicadoController::class, 'index']);
    Route::get('/admin/gestion',              [ComunicadoController::class, 'adminIndex']);
    Route::get('/indicadores',                [ComunicadoController::class, 'indicadores']);
    Route::post('/',                          [ComunicadoController::class, 'store']);
    Route::get('/{comunicado}',               [ComunicadoController::class, 'show']);
    Route::patch('/{comunicado}',             [ComunicadoController::class, 'update']);
    Route::delete('/{comunicado}',            [ComunicadoController::class, 'destroy']);
    Route::post('/{comunicado}/marcar-leido', [ComunicadoController::class, 'marcarLeido']);
});

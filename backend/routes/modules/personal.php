<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Personal\ComisionController;
use App\Http\Controllers\Personal\SolicitudPersonalController;

// Rutas del modulo Personal - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/tipos-solicitud-personal',                              [SolicitudPersonalController::class, 'tipos']);
    Route::get('/solicitudes-personal',                                  [SolicitudPersonalController::class, 'index']);
    Route::post('/solicitudes-personal',                                 [SolicitudPersonalController::class, 'store']);
    Route::patch('/solicitudes-personal/{solicitudPersonal}/resolver',   [SolicitudPersonalController::class, 'resolver']);
    Route::get('/solicitudes-personal/{solicitudPersonal}/documento/pdf',[SolicitudPersonalController::class, 'documentoPdf']);
    Route::get('/personal/{personalId}/historial',                       [SolicitudPersonalController::class, 'historial']);
    Route::get('/comisiones',                                            [ComisionController::class, 'index']);
    Route::post('/comisiones',                                           [ComisionController::class, 'store']);
    Route::get('/comisiones/{comision}/oficio/pdf',                      [ComisionController::class, 'oficioPdf']);

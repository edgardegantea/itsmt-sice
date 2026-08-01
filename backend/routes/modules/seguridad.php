<?php

use Illuminate\Support\Facades\Route;

// Rutas del modulo Seguridad - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/audit-logs',                                              [\App\Http\Controllers\Seguridad\AuditLogController::class, 'index']);
    Route::get('/audit-logs/indicadores',                                  [\App\Http\Controllers\Seguridad\AuditLogController::class, 'indicadores']);
    Route::get('/2fa/estatus',                                             [\App\Http\Controllers\Seguridad\TwoFactorController::class, 'estatus']);
    Route::post('/2fa/configurar',                                         [\App\Http\Controllers\Seguridad\TwoFactorController::class, 'configurar']);
    Route::post('/2fa/confirmar',                                          [\App\Http\Controllers\Seguridad\TwoFactorController::class, 'confirmar']);
    Route::post('/2fa/deshabilitar',                                       [\App\Http\Controllers\Seguridad\TwoFactorController::class, 'deshabilitar']);
    Route::get('/incidentes-seguridad',                                    [\App\Http\Controllers\Seguridad\IncidenteSeguridadController::class, 'index']);
    Route::post('/incidentes-seguridad',                                   [\App\Http\Controllers\Seguridad\IncidenteSeguridadController::class, 'store']);
    Route::patch('/incidentes-seguridad/{incidente}/estatus',              [\App\Http\Controllers\Seguridad\IncidenteSeguridadController::class, 'actualizarEstatus']);

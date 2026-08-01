<?php

use Illuminate\Support\Facades\Route;

// Rutas del modulo Infraestructura - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/inventario',                                                  [\App\Http\Controllers\Infraestructura\InventarioController::class, 'index']);
    Route::post('/inventario',                                                 [\App\Http\Controllers\Infraestructura\InventarioController::class, 'store']);
    Route::get('/inventario/{item}',                                           [\App\Http\Controllers\Infraestructura\InventarioController::class, 'show']);
    Route::patch('/inventario/{item}/estado',                                  [\App\Http\Controllers\Infraestructura\InventarioController::class, 'actualizarEstado']);
    Route::get('/prestamos-equipo',                                            [\App\Http\Controllers\Infraestructura\InventarioController::class, 'prestamos']);
    Route::post('/prestamos-equipo',                                           [\App\Http\Controllers\Infraestructura\InventarioController::class, 'storePrestamo']);
    Route::patch('/prestamos-equipo/{prestamo}/devolver',                      [\App\Http\Controllers\Infraestructura\InventarioController::class, 'devolverPrestamo']);
    Route::get('/reservas-espacios',                                           [\App\Http\Controllers\Infraestructura\InventarioController::class, 'reservas']);
    Route::post('/reservas-espacios',                                          [\App\Http\Controllers\Infraestructura\InventarioController::class, 'storeReserva']);
    Route::patch('/reservas-espacios/{reserva}/estatus',                       [\App\Http\Controllers\Infraestructura\InventarioController::class, 'actualizarEstatusReserva']);
    Route::get('/mantenimiento',                                               [\App\Http\Controllers\Infraestructura\InventarioController::class, 'mantenimiento']);
    Route::post('/mantenimiento',                                              [\App\Http\Controllers\Infraestructura\InventarioController::class, 'storeMantenimiento']);
    Route::patch('/mantenimiento/{solicitud}/atender',                         [\App\Http\Controllers\Infraestructura\InventarioController::class, 'atenderMantenimiento']);
    Route::get('/indicadores/infraestructura',                                 [\App\Http\Controllers\Infraestructura\InventarioController::class, 'indicadores']);

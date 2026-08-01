<?php

use Illuminate\Support\Facades\Route;

// Rutas del modulo Finanzas - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/alumnos/{alumno}/estado-cuenta',                              [\App\Http\Controllers\Finanzas\EstadoCuentaController::class, 'estadoCuenta']);
    Route::get('/alumnos/{alumno}/historial-pagos',                            [\App\Http\Controllers\Finanzas\EstadoCuentaController::class, 'historialPagos']);
    Route::post('/adeudos/{adeudo}/pagar',                                     [\App\Http\Controllers\Finanzas\EstadoCuentaController::class, 'registrarPago']);
    Route::get('/reportes/ingresos/{periodoId}',                               [\App\Http\Controllers\Finanzas\EstadoCuentaController::class, 'reporteIngresos']);

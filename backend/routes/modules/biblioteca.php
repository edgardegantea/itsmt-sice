<?php

use Illuminate\Support\Facades\Route;

// Rutas del modulo Biblioteca - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/acervo',                                                      [\App\Http\Controllers\Biblioteca\AcervoController::class, 'index']);
    Route::post('/acervo',                                                     [\App\Http\Controllers\Biblioteca\AcervoController::class, 'store']);
    Route::get('/acervo/{acervo}/ejemplares',                                  [\App\Http\Controllers\Biblioteca\AcervoController::class, 'ejemplares']);
    Route::post('/acervo/{acervo}/ejemplares',                                 [\App\Http\Controllers\Biblioteca\AcervoController::class, 'agregarEjemplar']);
    Route::get('/prestamos',                                                   [\App\Http\Controllers\Biblioteca\AcervoController::class, 'prestamos']);
    Route::post('/prestamos',                                                  [\App\Http\Controllers\Biblioteca\AcervoController::class, 'crearPrestamo']);
    Route::patch('/prestamos/{prestamo}/devolver',                             [\App\Http\Controllers\Biblioteca\AcervoController::class, 'devolver']);
    Route::patch('/prestamos/{prestamo}/renovar',                              [\App\Http\Controllers\Biblioteca\AcervoController::class, 'renovar']);
    Route::get('/usuarios/{user}/prestamos',                                   [\App\Http\Controllers\Biblioteca\AcervoController::class, 'prestamosPorUsuario']);
    Route::get('/biblioteca/estadisticas',                                     [\App\Http\Controllers\Biblioteca\AcervoController::class, 'estadisticas']);

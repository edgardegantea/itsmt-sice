<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Academico\AlumnoController;
use App\Http\Controllers\Cobros\CobroInscripcionController;

// Rutas del modulo Cobros - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/alumnos/{alumno}/expediente',               [AlumnoController::class, 'expediente']); // S11-03

    // Cobros CFDI — S1-11
    Route::post('/cobros-inscripcion',                       [CobroInscripcionController::class, 'store']);
    Route::get('/cobros-inscripcion/{recibo}/recibo/pdf',    [CobroInscripcionController::class, 'reciboPdf']);

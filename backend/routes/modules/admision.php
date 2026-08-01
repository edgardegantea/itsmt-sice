<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admision\AspiranteController;
use App\Http\Controllers\Admision\InscripcionController;
use App\Http\Controllers\Admision\InscripcionPdfController;

// Rutas del modulo Admision - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/aspirantes',                                            [AspiranteController::class, 'index']);
    Route::get('/aspirantes/lista-aceptados/{periodo}/pdf',             [InscripcionPdfController::class, 'listaAceptados']);
    Route::get('/aspirantes/lista-aceptados-por-carrera/{periodo}/pdf', [InscripcionPdfController::class, 'listaAceptadosPorCarrera']);
    Route::get('/aspirantes/{aspirante}',                               [AspiranteController::class, 'show']);
    Route::patch('/aspirantes/{aspirante}',                             [AspiranteController::class, 'update']);
    Route::patch('/aspirantes/{aspirante}/estatus',                     [AspiranteController::class, 'actualizarEstatus']);
    Route::post('/inscripciones',                    [InscripcionController::class, 'store']);
    Route::get('/inscripciones/{inscripcion}',       [InscripcionController::class, 'show']);
    Route::get('/inscripciones/{inscripcion}/solicitud-inscripcion/pdf', [InscripcionPdfController::class, 'solicitudInscripcion']);
    Route::get('/inscripciones/{inscripcion}/carta-compromiso/pdf',      [InscripcionPdfController::class, 'cartaCompromiso']);
    Route::get('/inscripciones/{inscripcion}/contrato-estudiante/pdf',   [InscripcionPdfController::class, 'contratoEstudiante']);
    Route::get('/inscripciones/{inscripcion}/carta-compromiso-docs/pdf', [InscripcionPdfController::class, 'cartaCompromisoDocs']);
    Route::get('/inscripciones/{inscripcion}/credencial/pdf',[InscripcionPdfController::class, 'credencial']);
    Route::get('/libro-registro-nc',                                          [InscripcionPdfController::class, 'libroRegistroNc']);
    Route::get('/alumnos/{alumno}/carga-academica/{periodo}/pdf',             [InscripcionPdfController::class, 'cargaAcademica']);
    Route::get('/grupos/{grupo}/carga-academica/{periodo}/pdf',               [InscripcionPdfController::class, 'cargaAcademicaGrupo']);
    Route::get('/alumno/mi-credencial/pdf',                               [InscripcionPdfController::class, 'miCredencial']);

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Vinculacion\AsesoriaRpController;
use App\Http\Controllers\Vinculacion\DictamenAnteproyectoController;
use App\Http\Controllers\Vinculacion\InformeSemestralAsesorController;
use App\Http\Controllers\Vinculacion\ResidenciaProfesionalController;
use App\Http\Controllers\Vinculacion\ServicioSocialController;
use App\Http\Controllers\Vinculacion\SolicitudRpController;

// Rutas del modulo Vinculacion - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/servicio-social',                                         [ServicioSocialController::class, 'index']);
    Route::post('/servicio-social',                                        [ServicioSocialController::class, 'store']);
    Route::patch('/servicio-social/{servicioSocial}/estatus',              [ServicioSocialController::class, 'actualizarEstatus']);
    Route::get('/alumnos/{alumno}/verificar-prerequisitos-residencia',     [ServicioSocialController::class, 'verificarPrerequisitosResidencia']);
    Route::get('/solicitudes-rp',                                                      [SolicitudRpController::class, 'index']);
    Route::post('/solicitudes-rp',                                                     [SolicitudRpController::class, 'store']);
    Route::get('/solicitudes-rp/{solicitudRp}/carta-presentacion/pdf',                 [SolicitudRpController::class, 'cartaPresentacionPdf']);
    Route::get('/informes-semestral-asesor',  [InformeSemestralAsesorController::class, 'index']);
    Route::post('/informes-semestral-asesor', [InformeSemestralAsesorController::class, 'store']);
    Route::post('/dictamenes-anteproyecto',                                [DictamenAnteproyectoController::class, 'store']);
    Route::get('/dictamenes-anteproyecto/{dictamenAnteproyecto}/pdf',      [DictamenAnteproyectoController::class, 'pdf']);
    Route::get('/residencias',                                             [ResidenciaProfesionalController::class, 'index']);
    Route::post('/residencias',                                            [ResidenciaProfesionalController::class, 'store']);
    Route::patch('/residencias/{residenciaProfesional}/asesor',            [ResidenciaProfesionalController::class, 'asignarAsesor']);
    Route::get('/residencias/{residenciaProfesional}/oficio-asesor/pdf',   [ResidenciaProfesionalController::class, 'oficioAsesorPdf']);
    Route::patch('/residencias/{residenciaProfesional}/seguimiento',       [ResidenciaProfesionalController::class, 'registrarSeguimiento']);
    Route::patch('/residencias/{residenciaProfesional}/evaluacion-reporte',[ResidenciaProfesionalController::class, 'evaluacionReporte']);
    Route::get('/asesorias-rp',                                            [AsesoriaRpController::class, 'index']);
    Route::post('/asesorias-rp',                                           [AsesoriaRpController::class, 'store']);

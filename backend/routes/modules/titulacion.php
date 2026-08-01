<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Titulacion\ActoProtocolarioController;
use App\Http\Controllers\Titulacion\CertificadoIdiomaController;
use App\Http\Controllers\Titulacion\ModalidadTitulacionController;
use App\Http\Controllers\Titulacion\SalidaLateralController;
use App\Http\Controllers\Titulacion\SolicitudActoProtocolarioController;

// Rutas del modulo Titulacion - extraidas de routes/api.php.
// Se registran dentro del grupo auth:sanctum en routes/api.php via require.

    Route::get('/modalidades-titulacion', [ModalidadTitulacionController::class, 'index']);
    Route::get('/certificados-idioma',                                     [CertificadoIdiomaController::class, 'index']);
    Route::post('/certificados-idioma',                                    [CertificadoIdiomaController::class, 'store']);
    Route::patch('/certificados-idioma/{certificadoIdioma}/validar',       [CertificadoIdiomaController::class, 'validar']);
    Route::get('/solicitudes-acto-protocolario',                           [SolicitudActoProtocolarioController::class, 'index']);
    Route::post('/solicitudes-acto-protocolario',                          [SolicitudActoProtocolarioController::class, 'store']);
    Route::patch('/solicitudes-acto-protocolario/{solicitudActoProtocolario}/no-inconveniencia',
                                                                           [SolicitudActoProtocolarioController::class, 'emitirNoInconveniencia']);
    Route::get('/solicitudes-acto-protocolario/{solicitudActoProtocolario}/no-inconveniencia/pdf',
                                                                           [SolicitudActoProtocolarioController::class, 'noInconvenienciaPdf']);
    Route::post('/actos-protocolarios',                                    [ActoProtocolarioController::class, 'store']);
    Route::get('/actos-protocolarios/{actoProtocolario}/aviso/pdf',        [ActoProtocolarioController::class, 'avisoPdf']);
    Route::patch('/actos-protocolarios/{actoProtocolario}/resultado',      [ActoProtocolarioController::class, 'registrarResultado']);
    Route::get('/actos-protocolarios/{actoProtocolario}/acta/pdf',         [ActoProtocolarioController::class, 'actaPdf']);
    Route::get('/actos-protocolarios/{actoProtocolario}/constancia-exencion/pdf',
                                                                           [ActoProtocolarioController::class, 'constanciaExencionPdf']);
    Route::get('/salida-lateral',                                          [SalidaLateralController::class, 'index']);
    Route::post('/salida-lateral',                                         [SalidaLateralController::class, 'store']);
    Route::patch('/salida-lateral/{salidaLateral}/estatus',                [SalidaLateralController::class, 'actualizarEstatus']);
    Route::get('/salida-lateral/{salidaLateral}/diploma/pdf',              [SalidaLateralController::class, 'diplomaPdf']);

<?php

use App\Http\Controllers\Admin\CarreraAdminController;
use App\Http\Controllers\Admin\UsuarioController;
use App\Http\Controllers\Admin\ConfiguracionController;
use App\Http\Controllers\Admin\CatalogoAdminController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\PeriodoAdminController;
use App\Http\Controllers\Academico\AlumnoController;
use App\Http\Controllers\Academico\CarreraController;
use App\Http\Controllers\Academico\PeriodoController;
use App\Http\Controllers\Admision\AspiranteController;
use App\Http\Controllers\Admision\InscripcionController;
use App\Http\Controllers\Admision\InscripcionPdfController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Catalogos\CatalogoPublicoController;
use App\Http\Controllers\Cobros\CobroInscripcionController;
use App\Http\Controllers\Api\PdfProtoController;
use App\Http\Controllers\Permanencia\ReinscripcionController;
use App\Http\Controllers\Permanencia\ConstanciaController;
use App\Http\Controllers\Permanencia\BajaController;
use App\Http\Controllers\Permanencia\AdeudoController;
use App\Http\Controllers\Permanencia\EncuestaSocioeconomicaController;
use App\Http\Controllers\Academico\MateriaController;
use App\Http\Controllers\Academico\GrupoController;
use App\Http\Controllers\Academico\CargaAcademicaController;
use App\Http\Controllers\Academico\TutoriaController;
use App\Http\Controllers\Academico\FuncionPersonalController;
use App\Http\Controllers\Academico\MallaCurricularController;
use App\Http\Controllers\Academico\AulaController;
use App\Http\Controllers\Academico\HorarioController;
use App\Http\Controllers\Academico\PlaneacionDocenteController;
use Illuminate\Support\Facades\Route;

// Sprint 0 — Auth
Route::prefix('auth')->group(function () {
    Route::post('/login',           [AuthController::class, 'login']);
    Route::post('/forgot-password', [PasswordResetController::class, 'forgotPassword']);
    Route::post('/reset-password',  [PasswordResetController::class, 'resetPassword']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',      [AuthController::class, 'me']);
    });
});

// Sprint 0 — Spike DomPDF
Route::get('/pdf-prototipo', [PdfProtoController::class, 'constancia']);

// Catálogos públicos (sin auth — para el formulario de registro)
Route::prefix('catalogo')->group(function () {
    Route::get('/estados',                    [CatalogoPublicoController::class, 'estados']);
    Route::get('/municipios',                 [CatalogoPublicoController::class, 'municipios']);
    Route::get('/escuelas',                   [CatalogoPublicoController::class, 'escuelas']);
    Route::get('/turnos',                     [CatalogoPublicoController::class, 'turnos']);
    Route::get('/verificar-curp/{curp}',      [CatalogoPublicoController::class, 'verificarCurp']);
    Route::get('/renapo/{curp}',              [CatalogoPublicoController::class, 'consultarRenapo']);
    Route::post('/municipios',                [CatalogoPublicoController::class, 'crearMunicipio']);
    Route::post('/escuelas',                  [CatalogoPublicoController::class, 'crearEscuela']);
});

// Configuración institucional (pública — la consumen Login, Layout, PDFs)
Route::get('/configuracion', [ConfiguracionController::class, 'show']);

// Sprint 1 — Admisión: endpoints públicos
Route::get('/carreras',        [CarreraController::class, 'index']);
Route::get('/periodos/activo', [PeriodoController::class, 'activo']);
Route::post('/aspirantes',                 [AspiranteController::class, 'store']);
Route::get('/aspirantes/consultar-estatus',[AspiranteController::class, 'consultarEstatus']);

// Sprint 1 — Admisión: endpoints protegidos
Route::middleware('auth:sanctum')->group(function () {
    // Aspirantes — rutas estáticas ANTES del wildcard {aspirante}
    Route::get('/aspirantes',                                            [AspiranteController::class, 'index']);
    Route::get('/aspirantes/lista-aceptados/{periodo}/pdf',             [InscripcionPdfController::class, 'listaAceptados']);
    Route::get('/aspirantes/lista-aceptados-por-carrera/{periodo}/pdf', [InscripcionPdfController::class, 'listaAceptadosPorCarrera']);
    Route::get('/aspirantes/{aspirante}',                               [AspiranteController::class, 'show']);
    Route::patch('/aspirantes/{aspirante}',                             [AspiranteController::class, 'update']);
    Route::patch('/aspirantes/{aspirante}/estatus',                     [AspiranteController::class, 'actualizarEstatus']);

    // Inscripción
    Route::post('/inscripciones',                    [InscripcionController::class, 'store']);
    Route::get('/inscripciones/{inscripcion}',       [InscripcionController::class, 'show']);

    // PDFs de inscripción
    Route::get('/inscripciones/{inscripcion}/solicitud-inscripcion/pdf', [InscripcionPdfController::class, 'solicitudInscripcion']);
    Route::get('/inscripciones/{inscripcion}/carta-compromiso/pdf',      [InscripcionPdfController::class, 'cartaCompromiso']);
    Route::get('/inscripciones/{inscripcion}/contrato-estudiante/pdf',   [InscripcionPdfController::class, 'contratoEstudiante']);
    Route::get('/inscripciones/{inscripcion}/carta-compromiso-docs/pdf', [InscripcionPdfController::class, 'cartaCompromisoDocs']);

    // Alumnos inscritos
    Route::get('/alumnos',                                   [AlumnoController::class, 'index']);
    Route::get('/alumnos/{alumno}',                          [AlumnoController::class, 'show']);
    Route::patch('/alumnos/{alumno}',                        [AlumnoController::class, 'update']);
    Route::get('/alumnos/{alumno}/autorizacion-expediente',  [AlumnoController::class, 'autorizacionExpediente']);
    Route::patch('/alumnos/{alumno}/autorizacion-expediente',[AlumnoController::class, 'actualizarAutorizacion']);

    // Cobros CFDI — S1-11
    Route::post('/cobros-inscripcion',                       [CobroInscripcionController::class, 'store']);
    Route::get('/cobros-inscripcion/{recibo}/recibo/pdf',    [CobroInscripcionController::class, 'reciboPdf']);

    // Credencial — S1-12
    Route::get('/inscripciones/{inscripcion}/credencial/pdf',[InscripcionPdfController::class, 'credencial']);

    // Libro Registro NC — S1-13
    Route::get('/libro-registro-nc',                         [InscripcionPdfController::class, 'libroRegistroNc']);

    // ── Gestión Académica (superadmin / admin) ────────────────────────────────

    // Materias / Asignaturas
    Route::get('/materias',                    [MateriaController::class, 'index']);
    Route::post('/materias',                   [MateriaController::class, 'store']);
    Route::patch('/materias/{materia}',        [MateriaController::class, 'update']);
    Route::delete('/materias/{materia}',       [MateriaController::class, 'destroy']);

    // Grupos
    Route::get('/grupos',                                           [GrupoController::class, 'index']);
    Route::post('/grupos',                                          [GrupoController::class, 'store']);
    Route::get('/grupos/{grupo}',                                   [GrupoController::class, 'show']);
    Route::patch('/grupos/{grupo}',                                 [GrupoController::class, 'update']);
    Route::delete('/grupos/{grupo}',                                [GrupoController::class, 'destroy']);
    Route::post('/grupos/{grupo}/alumnos',                          [GrupoController::class, 'asignarAlumnos']);
    Route::delete('/grupos/{grupo}/alumnos/{alumno}',               [GrupoController::class, 'quitarAlumno']);

    // Cargas académicas
    Route::get('/cargas-academicas',                               [CargaAcademicaController::class, 'index']);
    Route::post('/cargas-academicas',                              [CargaAcademicaController::class, 'store']);
    Route::patch('/cargas-academicas/{cargaAcademica}',            [CargaAcademicaController::class, 'update']);
    Route::delete('/cargas-academicas/{cargaAcademica}',           [CargaAcademicaController::class, 'destroy']);
    Route::get('/admin/docentes',                                  [CargaAcademicaController::class, 'docentes']);

    // Tutorías
    Route::get('/tutorias',                    [TutoriaController::class, 'index']);
    Route::post('/tutorias',                   [TutoriaController::class, 'store']);
    Route::post('/tutorias/masivo',            [TutoriaController::class, 'masivo']);
    Route::delete('/tutorias/{tutoria}',       [TutoriaController::class, 'destroy']);

    // Funciones del personal
    Route::get('/funciones-personal',                              [FuncionPersonalController::class, 'index']);
    Route::post('/funciones-personal',                             [FuncionPersonalController::class, 'store']);
    Route::patch('/funciones-personal/{funcionPersonal}',          [FuncionPersonalController::class, 'update']);
    Route::delete('/funciones-personal/{funcionPersonal}',         [FuncionPersonalController::class, 'destroy']);

    // Sprint 3 — Organización Académica
    // Mallas curriculares
    Route::get('/mallas-curriculares',                             [MallaCurricularController::class, 'index']);
    Route::post('/mallas-curriculares',                            [MallaCurricularController::class, 'store']);
    Route::patch('/mallas-curriculares/{mallaCurricular}',         [MallaCurricularController::class, 'update']);
    Route::delete('/mallas-curriculares/{mallaCurricular}',        [MallaCurricularController::class, 'destroy']);

    // Aulas
    Route::get('/aulas',                                           [AulaController::class, 'index']);
    Route::post('/aulas',                                          [AulaController::class, 'store']);
    Route::patch('/aulas/{aula}',                                  [AulaController::class, 'update']);
    Route::delete('/aulas/{aula}',                                 [AulaController::class, 'destroy']);

    // Horarios (con detección de conflictos)
    Route::get('/horarios',                                        [HorarioController::class, 'index']);
    Route::get('/horarios/conflictos',                             [HorarioController::class, 'conflictos']);
    Route::post('/horarios',                                       [HorarioController::class, 'store']);
    Route::delete('/horarios/{horario}',                           [HorarioController::class, 'destroy']);

    // Planeaciones didácticas
    Route::get('/planeaciones-docentes',                                          [PlaneacionDocenteController::class, 'index']);
    Route::get('/planeaciones-docentes/mias',                                     [PlaneacionDocenteController::class, 'mias']);
    Route::post('/planeaciones-docentes',                                         [PlaneacionDocenteController::class, 'store']);
    Route::post('/planeaciones-docentes/{planeacionDocente}/entregar',            [PlaneacionDocenteController::class, 'entregar']);
    Route::patch('/planeaciones-docentes/{planeacionDocente}/estatus',            [PlaneacionDocenteController::class, 'cambiarEstatus']);

    // Admin — Gestión de usuarios (solo admin)
    Route::get('/admin/usuarios',               [UsuarioController::class, 'index']);
    Route::post('/admin/usuarios',              [UsuarioController::class, 'store']);
    Route::get('/admin/usuarios/{usuario}',     [UsuarioController::class, 'show']);
    Route::patch('/admin/usuarios/{usuario}',   [UsuarioController::class, 'update']);
    Route::delete('/admin/usuarios/{usuario}',  [UsuarioController::class, 'destroy']);
    Route::get('/admin/roles',                  [UsuarioController::class, 'roles']);

    // Admin — Configuración institucional
    Route::get('/admin/configuracion',              [ConfiguracionController::class, 'show']);
    Route::patch('/admin/configuracion',            [ConfiguracionController::class, 'update']);
    Route::post('/admin/configuracion/logo',        [ConfiguracionController::class, 'subirLogo']);
    Route::delete('/admin/configuracion/logo',      [ConfiguracionController::class, 'eliminarLogo']);

    // Admin — Dashboard
    Route::get('/admin/dashboard', [DashboardController::class, 'index']);

    // Admin — Carreras CRUD
    Route::get('/admin/carreras',                           [CarreraAdminController::class, 'index']);
    Route::post('/admin/carreras',                          [CarreraAdminController::class, 'store']);
    Route::patch('/admin/carreras/{carrera}',               [CarreraAdminController::class, 'update']);
    Route::patch('/admin/carreras/{carrera}/toggle-activa', [CarreraAdminController::class, 'toggleActiva']);

    // Admin — Periodos CRUD
    Route::get('/admin/periodos',                    [PeriodoAdminController::class, 'index']);
    Route::post('/admin/periodos',                   [PeriodoAdminController::class, 'store']);
    Route::patch('/admin/periodos/{periodo}',         [PeriodoAdminController::class, 'update']);
    Route::patch('/admin/periodos/{periodo}/activar', [PeriodoAdminController::class, 'activar']);

    // Admin — Catálogos CRUD
    Route::prefix('admin/catalogos')->group(function () {
        // Estados
        Route::get('/estados',                   [CatalogoAdminController::class, 'estadosIndex']);
        Route::post('/estados',                  [CatalogoAdminController::class, 'estadosStore']);
        Route::patch('/estados/{estado}',        [CatalogoAdminController::class, 'estadosUpdate']);
        Route::delete('/estados/{estado}',       [CatalogoAdminController::class, 'estadosDestroy']);

        // Municipios
        Route::get('/municipios',                [CatalogoAdminController::class, 'municipiosIndex']);
        Route::post('/municipios',               [CatalogoAdminController::class, 'municipiosStore']);
        Route::patch('/municipios/{municipio}',  [CatalogoAdminController::class, 'municipiosUpdate']);
        Route::delete('/municipios/{municipio}', [CatalogoAdminController::class, 'municipiosDestroy']);

        // Escuelas
        Route::get('/escuelas',                  [CatalogoAdminController::class, 'escuelasIndex']);
        Route::post('/escuelas',                 [CatalogoAdminController::class, 'escuelasStore']);
        Route::patch('/escuelas/{escuela}',      [CatalogoAdminController::class, 'escuelasUpdate']);
        Route::delete('/escuelas/{escuela}',     [CatalogoAdminController::class, 'escuelasDestroy']);

        // Turnos
        Route::get('/turnos',                    [CatalogoAdminController::class, 'turnosIndex']);
        Route::post('/turnos',                   [CatalogoAdminController::class, 'turnosStore']);
        Route::patch('/turnos/{turno}',          [CatalogoAdminController::class, 'turnosUpdate']);
        Route::delete('/turnos/{turno}',         [CatalogoAdminController::class, 'turnosDestroy']);
    });

    // ── Sprint 2 — Permanencia, Bajas y Trámites ──────────────────────────────
    // Reinscripciones
    Route::get('/reinscripciones',                                        [ReinscripcionController::class, 'index']);
    Route::post('/reinscripciones',                                       [ReinscripcionController::class, 'store']);
    Route::patch('/reinscripciones/{reinscripcion}/estatus',              [ReinscripcionController::class, 'actualizarEstatus']);
    Route::patch('/reinscripciones/{reinscripcion}/resello-credencial',   [ReinscripcionController::class, 'registrarResello']);

    // Orden de reinscripción
    Route::post('/orden-reinscripcion',                                   [ReinscripcionController::class, 'publicarOrden']);
    Route::get('/orden-reinscripcion/{periodo_id}',                       [ReinscripcionController::class, 'consultarOrden']);

    // Adeudos
    Route::get('/adeudos',                                                [AdeudoController::class, 'index']);
    Route::post('/adeudos',                                               [AdeudoController::class, 'store']);
    Route::patch('/adeudos/{adeudo}/pagar',                               [AdeudoController::class, 'marcarPagado']);
    Route::delete('/adeudos/{adeudo}',                                    [AdeudoController::class, 'destroy']);
    Route::get('/alumnos/{alumno}/adeudos',                               [ReinscripcionController::class, 'adeudos']);

    // Bajas
    Route::get('/bajas',                                                  [BajaController::class, 'index']);
    Route::post('/bajas',                                                 [BajaController::class, 'store']);
    Route::post('/bajas/solicitar',                                       [BajaController::class, 'solicitar']);
    Route::get('/bajas/mias',                                             [BajaController::class, 'mias']);
    Route::get('/alumnos/{alumno}/bajas',                                 [BajaController::class, 'porAlumno']);

    // Constancias
    Route::get('/constancias',                                            [ConstanciaController::class, 'index']);
    Route::post('/constancias',                                           [ConstanciaController::class, 'store']);
    Route::get('/alumnos/{alumno}/constancias',                           [ConstanciaController::class, 'porAlumno']);
    Route::post('/constancias/{constancia}/emitir',                       [ConstanciaController::class, 'emitir']);

    // Encuesta Socioeconómica — alumno
    Route::get('/encuestas-socioeconomicas/mi-encuesta',                  [EncuestaSocioeconomicaController::class, 'miEncuesta']);
    Route::post('/encuestas-socioeconomicas',                             [EncuestaSocioeconomicaController::class, 'guardar']);
    Route::post('/encuestas-socioeconomicas/{encuesta}/enviar',           [EncuestaSocioeconomicaController::class, 'enviar']);

    // Encuesta Socioeconómica — admin
    Route::get('/admin/encuestas-socioeconomicas',                        [EncuestaSocioeconomicaController::class, 'index']);
    Route::get('/admin/encuestas-socioeconomicas/{encuesta}',             [EncuestaSocioeconomicaController::class, 'show']);
});

<?php

use App\Http\Controllers\Admin\CarreraAdminController;
use App\Http\Controllers\Admin\UsuarioController;
use App\Http\Controllers\Admin\ConfiguracionController;
use App\Http\Controllers\Admin\CatalogoAdminController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\PeriodoAdminController;
use App\Http\Controllers\Admin\PermisosController;
use App\Http\Controllers\Admin\DirectorioController;
use App\Http\Controllers\Admin\DirectorioAreaController;
use App\Http\Controllers\Admin\DirectorioPuestoController;
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
use App\Http\Controllers\Academico\HorarioTrabajoController;
use App\Http\Controllers\Academico\ConfiguracionEvaluacionController;
use App\Http\Controllers\Academico\CalificacionController;
use App\Http\Controllers\Academico\CorteCapturaController;
use App\Http\Controllers\Academico\AlertaCorteCapturaController;
use App\Http\Controllers\Academico\CierreDeCursoController;
use App\Http\Controllers\Academico\ActaCalificacionesController;
use App\Http\Controllers\Academico\AlertaBajaDefinitivaController;
use App\Http\Controllers\Academico\DisponibilidadDocenteController;
use App\Http\Controllers\Academico\DiaNoLaborableController;
use App\Http\Controllers\Academico\BuilderHorarioController;
use App\Http\Controllers\Academico\DiagnosticoHorarioController;
use App\Http\Controllers\Academico\BuscarDisponibilidadController;
use App\Http\Controllers\Academico\CargaEstadoController;
use App\Http\Controllers\Academico\ConcentradoHorarioController;
use App\Http\Controllers\Academico\PrecargaController;
use App\Http\Controllers\Calidad\TipoActividadController;
use App\Http\Controllers\Calidad\ActividadComplementariaController;
use App\Http\Controllers\Calidad\EvaluacionDocenteController;
use App\Http\Controllers\Vinculacion\ServicioSocialController;
use App\Http\Controllers\Vinculacion\SolicitudRpController;
use App\Http\Controllers\Vinculacion\DictamenAnteproyectoController;
use App\Http\Controllers\Vinculacion\ResidenciaProfesionalController;
use App\Http\Controllers\Vinculacion\AsesoriaRpController;
use App\Http\Controllers\Titulacion\SolicitudActoProtocolarioController;
use App\Http\Controllers\Titulacion\ActoProtocolarioController;
use App\Http\Controllers\Titulacion\CertificadoIdiomaController;
use App\Http\Controllers\Titulacion\SalidaLateralController;
use App\Http\Controllers\Titulacion\ModalidadTitulacionController;
use App\Http\Controllers\Analitica\IndicadoresController;
use App\Http\Controllers\Academico\AsignacionDocenteController;
use App\Http\Controllers\Academico\InstrumentacionDidacticaController;
use App\Http\Controllers\Academico\FichaDocenteController;
use App\Http\Controllers\Academico\SesionClaseController;
use App\Http\Controllers\Academico\AlertaInasistenciaController;
use App\Http\Controllers\Personal\SolicitudPersonalController;
use App\Http\Controllers\Personal\ComisionController;
use App\Http\Controllers\Capacitacion\CursoCapacitacionController;
use App\Http\Controllers\Capacitacion\AsistenciaCapacitacionController;
use App\Http\Controllers\Capacitacion\EvaluacionSeguimientoCapController;
use App\Http\Controllers\Academico\EspecialidadController;
use App\Http\Controllers\Vinculacion\InformeSemestralAsesorController;
use App\Http\Controllers\Academico\EgresadoController;
use App\Http\Controllers\Academico\ReporteDirectivoController;
use App\Http\Controllers\Academico\IndicadoresAsistenciaController;
use App\Http\Controllers\Academico\AsignacionTutoriaController;
use App\Http\Controllers\Academico\SesionTutoriaController;
use App\Http\Controllers\Academico\PlanAccionTutorialController;
use App\Http\Controllers\Academico\IndicadoresTutoriaController;
use App\Http\Controllers\Academico\TrasladoController;
use App\Http\Controllers\Academico\ConvalidacionController;
use App\Http\Controllers\Academico\EquivalenciaController;
use App\Http\Controllers\Academico\ConvenioMovilidadController;
use App\Http\Controllers\Academico\MovilidadEstudiantilController;
use App\Http\Controllers\Academico\CursoVeranoController;
use App\Http\Controllers\Academico\ProgramaDistanciaController;
use App\Http\Controllers\Academico\InscripcionDistanciaController;
use App\Http\Controllers\Academico\EducacionDistanciaController;
use App\Http\Controllers\Academico\FichaSindicalController;
use App\Http\Controllers\Academico\PlazaController;
use App\Http\Controllers\Academico\PlantillaSindicalController;
use App\Http\Controllers\Academico\PermisoSindicalController;
use App\Http\Controllers\Academico\ConcursoOposicionController;
use App\Http\Controllers\Academico\AusentismoSindicalController;
use App\Http\Controllers\Academico\InformeSindicalController;
use App\Http\Controllers\Convocatoria\ConvocatoriaController;
use App\Http\Controllers\Convocatoria\PostulacionController;
use Illuminate\Support\Facades\Route;

// Sprint 0 — Auth
Route::prefix('auth')->group(function () {
    Route::post('/login',           [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('/2fa/verificar',   [AuthController::class, 'verificarDosFactores'])->middleware('throttle:5,1');
    Route::post('/forgot-password', [PasswordResetController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('/reset-password',  [PasswordResetController::class, 'resetPassword'])->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout',           [AuthController::class, 'logout']);
        Route::get('/me',                [AuthController::class, 'me']);
        Route::patch('/cambiar-password',[\App\Http\Controllers\Auth\PasswordController::class, 'cambiar']);
    });
});

// Catálogos públicos (sin auth — para el formulario de registro)
Route::prefix('catalogo')->group(function () {
    Route::get('/estados',                    [CatalogoPublicoController::class, 'estados']);
    Route::get('/municipios',                 [CatalogoPublicoController::class, 'municipios']);
    Route::get('/escuelas',                   [CatalogoPublicoController::class, 'escuelas']);
    Route::get('/turnos',                     [CatalogoPublicoController::class, 'turnos']);
    Route::get('/verificar-curp/{curp}',      [CatalogoPublicoController::class, 'verificarCurp'])->middleware('throttle:15,1');
    Route::get('/renapo/{curp}',              [CatalogoPublicoController::class, 'consultarRenapo'])->middleware('throttle:10,1');
    Route::post('/municipios',                [CatalogoPublicoController::class, 'crearMunicipio'])->middleware('throttle:10,1');
    Route::post('/escuelas',                  [CatalogoPublicoController::class, 'crearEscuela'])->middleware('throttle:10,1');
});

// Configuración institucional (pública — la consumen Login, Layout, PDFs)
Route::get('/configuracion', [ConfiguracionController::class, 'show']);

// Sprint 1 — Admisión: endpoints públicos
Route::get('/carreras',        [CarreraController::class, 'index']);
Route::get('/periodos/activo', [PeriodoController::class, 'activo']);
Route::post('/aspirantes',                 [AspiranteController::class, 'store']);
Route::get('/aspirantes/consultar-estatus',[AspiranteController::class, 'consultarEstatus'])->middleware('throttle:20,1');

// Sprint 1 — Admisión: endpoints protegidos
Route::middleware('auth:sanctum')->group(function () {
    require __DIR__.'/modules/becas.php';
    require __DIR__.'/modules/biblioteca.php';
    require __DIR__.'/modules/calidad.php';
    require __DIR__.'/modules/capacitacion.php';
    require __DIR__.'/modules/cobros.php';
    require __DIR__.'/modules/convocatoria.php';
    require __DIR__.'/modules/finanzas.php';
    require __DIR__.'/modules/infraestructura.php';
    require __DIR__.'/modules/investigacion.php';
    require __DIR__.'/modules/personal.php';
    require __DIR__.'/modules/reinscripcion.php';
    require __DIR__.'/modules/seguridad.php';
    require __DIR__.'/modules/comunicacion.php';
    require __DIR__.'/modules/titulacion.php';
    require __DIR__.'/modules/vinculacion.php';
    require __DIR__.'/modules/academico.php';
    require __DIR__.'/modules/admision.php';
    require __DIR__.'/modules/permanencia.php';

    // Notificaciones internas
    Route::get('/notificaciones',                               [App\Http\Controllers\Api\NotificacionController::class, 'index']);
    Route::patch('/notificaciones/{notificacion}/marcar-leida', [App\Http\Controllers\Api\NotificacionController::class, 'marcarLeida']);
    Route::post('/notificaciones/marcar-todas-leidas',          [App\Http\Controllers\Api\NotificacionController::class, 'marcarTodasLeidas']);

    // Aspirantes — rutas estáticas ANTES del wildcard {aspirante}

    // Inscripción

    // PDFs de inscripción

    // Alumnos inscritos

    // Credencial — S1-12

    // Libro Registro NC — S1-13

    // ── Gestión Académica (superadmin / admin) ────────────────────────────────

    // Materias / Asignaturas
    Route::post('/materias/extraer-programa',            \App\Http\Controllers\Academico\ExtraerProgramaController::class);

    // Grupos
    // Liberar bulk ANTES de los wildcards {grupo}

    // Cargas académicas
    Route::get('/docentes/{docente}/carga-academica/pdf',          \App\Http\Controllers\Academico\CargaDocentePdfController::class);

    // Fichas docentes (S11-04)

    // Tutorías

    // Funciones del personal

    // Sprint 3 — Organización Académica
    // Mallas curriculares

    // Aulas (S11-01)

    // Horarios (con detección de conflictos)

    // Builder de horarios — disponibilidad docente y grid visual

    // Disponibilidad docente (autoregistro por periodo)

    // Días no laborables

    // Estado de carga académica (confirmación y reporte de conflicto por docente)

    // Planeaciones didácticas


    // Admin — Gestión de usuarios (solo admin)
    Route::get('/admin/usuarios',               [UsuarioController::class, 'index']);
    Route::post('/admin/usuarios',              [UsuarioController::class, 'store']);
    Route::get('/admin/usuarios/{usuario}',     [UsuarioController::class, 'show']);
    Route::patch('/admin/usuarios/{usuario}',   [UsuarioController::class, 'update']);
    Route::delete('/admin/usuarios/{usuario}',              [UsuarioController::class, 'destroy']);
    Route::patch('/admin/usuarios/{usuario}/credenciales', [UsuarioController::class, 'actualizarCredenciales']);
    Route::patch('/admin/usuarios/{usuario}/activo',        [UsuarioController::class, 'toggleActivo']);
    Route::patch('/admin/usuarios/{usuario}/recordatorio-asistencia', [UsuarioController::class, 'actualizarRecordatorioAsistencia']);
    Route::post('/admin/usuarios/{usuario}/foto',           [UsuarioController::class, 'subirFoto']);
    Route::get('/admin/roles',                             [UsuarioController::class, 'roles']);

    // Admin — Gestión de permisos
    Route::get('/admin/permisos/catalogo',                  [PermisosController::class, 'catalogo']);
    Route::get('/admin/permisos/roles',                     [PermisosController::class, 'roles']);
    Route::put('/admin/permisos/roles/{rol}',               [PermisosController::class, 'updateRol']);
    Route::get('/admin/permisos/usuarios/{usuario}',        [PermisosController::class, 'showUsuario']);
    Route::put('/admin/permisos/usuarios/{usuario}',        [PermisosController::class, 'updateUsuario']);

    // Admin — Configuración institucional
    Route::get('/admin/configuracion',              [ConfiguracionController::class, 'show']);
    Route::patch('/admin/configuracion',            [ConfiguracionController::class, 'update']);
    Route::post('/admin/configuracion/logo',        [ConfiguracionController::class, 'subirLogo']);
    Route::delete('/admin/configuracion/logo',      [ConfiguracionController::class, 'eliminarLogo']);
    Route::patch('/admin/configuracion/maestria',   [ConfiguracionController::class, 'toggleMaestria']);
    Route::patch('/admin/configuracion/recordatorios-asistencia', [ConfiguracionController::class, 'toggleRecordatoriosAsistencia']);


    // Admin — Dashboard
    Route::get('/admin/dashboard', [DashboardController::class, 'index']);

    // Admin — Carreras CRUD
    Route::get('/admin/carreras',                           [CarreraAdminController::class, 'index']);
    Route::get('/admin/carreras/{carrera}',                 [CarreraAdminController::class, 'show']);
    Route::post('/admin/carreras',                          [CarreraAdminController::class, 'store']);
    Route::patch('/admin/carreras/{carrera}',               [CarreraAdminController::class, 'update']);
    Route::patch('/admin/carreras/{carrera}/toggle-activa', [CarreraAdminController::class, 'toggleActiva']);

    // Admin — Directorio institucional
    Route::get('/admin/directorio',                         [DirectorioController::class, 'index']);
    Route::get('/admin/directorio/usuarios-disponibles',    [DirectorioController::class, 'usuariosDisponibles']);
    Route::post('/admin/directorio',                        [DirectorioController::class, 'store']);
    Route::patch('/admin/directorio/{directorio}',          [DirectorioController::class, 'update']);
    Route::delete('/admin/directorio/{directorio}',         [DirectorioController::class, 'destroy']);
    // Admin — Directorio: Áreas
    Route::get('/admin/directorio-areas',                   [DirectorioAreaController::class, 'index']);
    Route::post('/admin/directorio-areas',                  [DirectorioAreaController::class, 'store']);
    Route::patch('/admin/directorio-areas/{area}',          [DirectorioAreaController::class, 'update']);
    Route::delete('/admin/directorio-areas/{area}',         [DirectorioAreaController::class, 'destroy']);
    // Admin — Directorio: Puestos
    Route::get('/admin/directorio-puestos',                 [DirectorioPuestoController::class, 'index']);
    Route::post('/admin/directorio-puestos',                [DirectorioPuestoController::class, 'store']);
    Route::patch('/admin/directorio-puestos/{puesto}',      [DirectorioPuestoController::class, 'update']);
    Route::delete('/admin/directorio-puestos/{puesto}',     [DirectorioPuestoController::class, 'destroy']);

    // Admin — Periodos CRUD
    Route::get('/admin/periodos',                              [PeriodoAdminController::class, 'index']);
    Route::post('/admin/periodos',                             [PeriodoAdminController::class, 'store']);
    Route::patch('/admin/periodos/{periodo}',                  [PeriodoAdminController::class, 'update']);
    Route::patch('/admin/periodos/{periodo}/activar',          [PeriodoAdminController::class, 'activar']);
    Route::patch('/admin/periodos/{periodo}/liberar-horarios', [PeriodoAdminController::class, 'liberarHorarios']);
    Route::delete('/admin/periodos/{periodo}',                 [PeriodoAdminController::class, 'destroy']);

    // Admin — Cortes de captura de calificaciones

    // Alumno — Credencial propia (autoservicio)

    // Alumno — Precarga académica (1er semestre: asignada; 2+: selección)

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

        // Planteles
        Route::get('/planteles',                    [CatalogoAdminController::class, 'plantelesIndex']);
        Route::post('/planteles',                   [CatalogoAdminController::class, 'plantelesStore']);
        Route::patch('/planteles/{plantel}',        [CatalogoAdminController::class, 'plantelesUpdate']);
        Route::delete('/planteles/{plantel}',       [CatalogoAdminController::class, 'plantelesDestroy']);
    });

    // ── Sprint 2 — Permanencia, Bajas y Trámites ──────────────────────────────
    // Reinscripciones

    // Orden de reinscripción

    // Adeudos

    // Bajas

    // Constancias

    // Encuesta Socioeconómica — alumno

    // Encuesta Socioeconómica — admin

    // ── Sprint 4 — Control de Aula ────────────────────────────────────────────

    // Configuración de evaluación por carrera

    // Calificaciones — IMPORTANTE: declarar ANTES del wildcard /grupos/{grupo}

    // Cierre de curso

    // Situación académica del alumno (S4-06)
    // Kardex permanente del alumno (S4-07)

    // ── Sprint 5 — Calidad Educativa ──────────────────────────────────────────

    // Catálogo de tipos de actividad complementaria (12 tipos oficiales TecNM)

    // Actividades complementarias (S5-01, S5-02)

    // Evaluaciones docentes anónimas (S5-03, S5-04)
    // resultados ANTES del wildcard para evitar conflicto de rutas

    // Sprint 29 — Evaluación Docente ampliada (esqueleto habilitado, pendiente de diseño detallado)

    // ── Sprint 30 — Auditoría y Trazabilidad ──────────────────────────────────────

    // ── Sprint 31 — Seguridad Informática ─────────────────────────────────────────

    // ── Sprint 6 — Vinculación Institucional ─────────────────────────────────

    // Servicio Social (S6-01, S6-02, S6-03)

    // Verificar prerrequisitos para RP (S6-06)

    // Solicitudes de Residencia Profesional (S6-06)

    // Informes Semestrales del Asesor (S6-10 — TecNM-AC-PO-004-06)

    // Dictamen de anteproyecto (S6-07)

    // Residencias profesionales (S6-04, S6-08, S6-10, S6-11)

    // Asesorías RP (S6-09 — stub)

    // ── Sprint 7 — Cierre Académico y Salida Lateral ──────────────────────────

    // Modalidades de titulación (catálogo)

    // Certificados de idioma (S7-05)

    // Solicitudes de Acto Protocolario (S7-03, S7-04)

    // Actos Protocolarios (S7-04)

    // Salida Lateral (S7-06, S7-07)

    // ── Sprint 10 — Gestión de Personal Docente (TecNM-AC-PO-005) ───────────────
    // Tipos de solicitud (catálogo)

    // Solicitudes de permiso/licencia (S10-01/S10-02/S10-04)

    // Comisiones (S10-03)

    // Cursos de Capacitación AP/FD (S10-07/S10-08)

    // Asistencias de Capacitación (S10-09)

    // Evaluaciones de Seguimiento Capacitación (S10-10)

    // Registro General Capacitación (S10-11)

    // ── Sprint 9 — Planeación Académica (TecNM-AC-PO-003 / PO-007) ──────────────
    // Asignaciones docentes (S9-01/S9-02)

    // Especialidades (S9-06)

    // Instrumentaciones didácticas (S9-03/S9-04/S9-05)

    // ── Sprint 8 — Inteligencia Analítica ────────────────────────────────────────
    Route::get('/indicadores/desercion',           [IndicadoresController::class, 'desercion']);
    Route::get('/indicadores/retencion',           [IndicadoresController::class, 'retencion']);
    Route::get('/indicadores/eficiencia-terminal', [IndicadoresController::class, 'eficienciaTerminal']);
    Route::get('/indicadores/promedio',            [IndicadoresController::class, 'promedio']);
    Route::get('/indicadores/reprobacion',         [IndicadoresController::class, 'reprobacion']);

    // ── Sprint 12 — Asistencia y Seguimiento Académico ───────────────────────────

    // ── Sprint 13 — Reportes Directivos y Egresados ──────────────────────────────
    // Egresados (S13-01)

    // Sprint 28 — Portal del Egresado (ampliación): historial laboral, encuestas y bolsa de trabajo
    Route::get('/egresados/{egresado}/historial-laboral',                      [\App\Http\Controllers\Academico\PortalEgresadoController::class, 'historialLaboral']);
    Route::post('/egresados/{egresado}/historial-laboral',                     [\App\Http\Controllers\Academico\PortalEgresadoController::class, 'storeHistorialLaboral']);
    Route::get('/egresados/{egresado}/encuestas',                              [\App\Http\Controllers\Academico\PortalEgresadoController::class, 'encuestas']);
    Route::post('/egresados/{egresado}/encuestas',                             [\App\Http\Controllers\Academico\PortalEgresadoController::class, 'storeEncuesta']);
    Route::patch('/encuestas-seguimiento/{encuesta}/responder',                [\App\Http\Controllers\Academico\PortalEgresadoController::class, 'responderEncuesta']);
    Route::get('/vacantes-bolsa-trabajo',                                      [\App\Http\Controllers\Academico\PortalEgresadoController::class, 'vacantes']);
    Route::post('/vacantes-bolsa-trabajo',                                     [\App\Http\Controllers\Academico\PortalEgresadoController::class, 'storeVacante']);
    Route::post('/vacantes-bolsa-trabajo/{vacante}/postulaciones',             [\App\Http\Controllers\Academico\PortalEgresadoController::class, 'postular']);
    Route::patch('/postulaciones-bolsa-trabajo/{postulacion}/estatus',         [\App\Http\Controllers\Academico\PortalEgresadoController::class, 'actualizarEstatusPostulacion']);
    Route::get('/indicadores/empleabilidad',                                   [\App\Http\Controllers\Academico\PortalEgresadoController::class, 'indicadoresEmpleabilidad']);

    // Reportes PDF directivos (S13-02, S13-03, S13-04)

    // Dashboard asistencia institucional (S13-05)

    // ── Sprint 14 — Programa Institucional de Tutoría ─────────────────────────────

    // ── Sprint 15 — Traslado, Convalidación y Equivalencia ────────────────────────

    // ── Sprint 16 — Movilidad Estudiantil y Cursos de Verano ──────────────────────

    // ── Sprint 17 — Educación a Distancia (TecNM Cap. 16) ────────────────────────

    // ── Sprint 18 — Catálogo de Personal Sindicalizado ────────────────────────────

    // ── Sprint 19 — Permisos Sindicales y Escalafón ───────────────────────────────

    // ── Sprint 20 — Convocatorias Institucionales ─────────────────────────────────

    // ── Sprint 21 — Reinscripción Oficial TecNM-AC-PO-002 (Calendario Escolar) ──

    // ── Sprint 22 — Estados de Cuenta y Finanzas ──────────────────────────────────

    // ── Sprint 23 — Módulo de Becas TecNM ────────────────────────────────────────

    // ── Sprint 24 — Biblioteca ────────────────────────────────────────────────────

    // ── Sprint 25 — Acreditación y Calidad ISO/CACEI ──────────────────────────────

    // ── Sprint 26 — Cuerpos Académicos e Investigación ────────────────────────────

    // ── Sprint 27 — Infraestructura y Recursos ────────────────────────────────────
});

// Feed de exportación para Power BI / Looker Studio — autenticado por X-Api-Key en
// vez de Sanctum, porque esas herramientas no pueden iniciar sesión en la SPA.
Route::middleware('apikey')->prefix('bi')->group(function () {
    Route::get('/indicadores-carrera.csv', [\App\Http\Controllers\Academico\ExportacionBiController::class, 'indicadoresCarrera']);
    Route::get('/incidencias.csv',         [\App\Http\Controllers\Academico\ExportacionBiController::class, 'incidencias']);
    Route::get('/asistencia.csv',          [\App\Http\Controllers\Academico\ExportacionBiController::class, 'asistencia']);
    Route::get('/ocupacion-aulas.csv',     [\App\Http\Controllers\Academico\ExportacionBiController::class, 'ocupacionAulas']);
});

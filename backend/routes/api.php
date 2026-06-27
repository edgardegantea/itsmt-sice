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
use App\Http\Controllers\Academico\ConfiguracionEvaluacionController;
use App\Http\Controllers\Academico\CalificacionController;
use App\Http\Controllers\Academico\CierreDeCursoController;
use App\Http\Controllers\Academico\ActaCalificacionesController;
use App\Http\Controllers\Academico\AlertaBajaDefinitivaController;
use App\Http\Controllers\Academico\PrecargaController;
use App\Http\Controllers\Calidad\TipoActividadController;
use App\Http\Controllers\Calidad\ActividadComplementariaController;
use App\Http\Controllers\Calidad\EvaluacionDocenteController;
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
    Route::get('/libro-registro-nc',                                          [InscripcionPdfController::class, 'libroRegistroNc']);
    Route::get('/alumnos/{alumno}/carga-academica/{periodo}/pdf',             [InscripcionPdfController::class, 'cargaAcademica']);

    // ── Gestión Académica (superadmin / admin) ────────────────────────────────

    // Materias / Asignaturas
    Route::post('/materias/extraer-programa',            \App\Http\Controllers\Academico\ExtraerProgramaController::class);
    Route::get('/materias',                              [MateriaController::class, 'index']);
    Route::post('/materias',                             [MateriaController::class, 'store']);
    Route::get('/materias/{materia}',                    [MateriaController::class, 'show']);
    Route::patch('/materias/{materia}',                  [MateriaController::class, 'update']);
    Route::delete('/materias/{materia}',                 [MateriaController::class, 'destroy']);
    Route::post('/materias/{materia}/documento',         [MateriaController::class, 'subirDocumento']);
    Route::delete('/materias/{materia}/documento',       [MateriaController::class, 'eliminarDocumento']);

    // Grupos
    Route::get('/grupos',                                           [GrupoController::class, 'index']);
    Route::post('/grupos',                                          [GrupoController::class, 'store']);
    // Liberar bulk ANTES de los wildcards {grupo}
    Route::post('/grupos/liberar-horarios-bulk',                    [GrupoController::class, 'liberarHorariosBulk']);
    Route::get('/grupos/{grupo}',                                   [GrupoController::class, 'show']);
    Route::patch('/grupos/{grupo}',                                 [GrupoController::class, 'update']);
    Route::delete('/grupos/{grupo}',                                [GrupoController::class, 'destroy']);
    Route::patch('/grupos/{grupo}/liberar-horarios',                [GrupoController::class, 'liberarHorarios']);
    Route::post('/grupos/{grupo}/alumnos',                          [GrupoController::class, 'asignarAlumnos']);
    Route::delete('/grupos/{grupo}/alumnos/{alumno}',               [GrupoController::class, 'quitarAlumno']);

    // Cargas académicas
    Route::get('/cargas-academicas',                               [CargaAcademicaController::class, 'index']);
    Route::post('/cargas-academicas',                              [CargaAcademicaController::class, 'store']);
    Route::patch('/cargas-academicas/{cargaAcademica}',            [CargaAcademicaController::class, 'update']);
    Route::delete('/cargas-academicas/{cargaAcademica}',           [CargaAcademicaController::class, 'destroy']);
    Route::get('/admin/docentes',                                  [CargaAcademicaController::class, 'docentes']);
    Route::get('/docentes/{docente}/carga-academica/pdf',          \App\Http\Controllers\Academico\CargaDocentePdfController::class);

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
    Route::get('/horarios/disponibilidad',                         [HorarioController::class, 'disponibilidad']);
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
    Route::delete('/admin/usuarios/{usuario}',              [UsuarioController::class, 'destroy']);
    Route::patch('/admin/usuarios/{usuario}/credenciales', [UsuarioController::class, 'actualizarCredenciales']);
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

    // Alumno — Precarga académica (1er semestre: asignada; 2+: selección)
    Route::get('/alumno/precarga-academica',                              [PrecargaController::class, 'index']);
    Route::get('/alumno/precarga-academica/pdf',                          [PrecargaController::class, 'pdf']);
    Route::post('/alumno/precarga-academica/selecciones',                 [PrecargaController::class, 'seleccionar']);
    Route::delete('/alumno/precarga-academica/selecciones/{carga_id}',   [PrecargaController::class, 'deseleccionar']);

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
    Route::patch('/bajas/{baja}/estatus',                                 [BajaController::class, 'actualizarEstatus']);
    Route::get('/alumnos/{alumno}/bajas',                                 [BajaController::class, 'porAlumno']);

    // Constancias
    Route::get('/constancias',                                            [ConstanciaController::class, 'index']);
    Route::post('/constancias',                                           [ConstanciaController::class, 'store']);
    Route::get('/alumnos/{alumno}/constancias',                           [ConstanciaController::class, 'porAlumno']);
    Route::post('/constancias/{constancia}/emitir',                       [ConstanciaController::class, 'emitir']);
    Route::get('/constancias/{constancia}/pdf',                           [ConstanciaController::class, 'pdf']);

    // Encuesta Socioeconómica — alumno
    Route::get('/encuestas-socioeconomicas/mi-encuesta',                  [EncuestaSocioeconomicaController::class, 'miEncuesta']);
    Route::post('/encuestas-socioeconomicas',                             [EncuestaSocioeconomicaController::class, 'guardar']);
    Route::post('/encuestas-socioeconomicas/{encuesta}/enviar',           [EncuestaSocioeconomicaController::class, 'enviar']);

    // Encuesta Socioeconómica — admin
    Route::get('/admin/encuestas-socioeconomicas',                        [EncuestaSocioeconomicaController::class, 'index']);
    Route::get('/admin/encuestas-socioeconomicas/{encuesta}',             [EncuestaSocioeconomicaController::class, 'show']);
    Route::patch('/admin/encuestas-socioeconomicas/{encuesta}',           [EncuestaSocioeconomicaController::class, 'adminUpdate']);

    // ── Sprint 4 — Control de Aula ────────────────────────────────────────────

    // Configuración de evaluación por carrera
    Route::post('/configuraciones-evaluacion',                            [ConfiguracionEvaluacionController::class, 'store']);
    Route::get('/configuraciones-evaluacion/{carreraId}',                 [ConfiguracionEvaluacionController::class, 'show']);

    // Calificaciones — IMPORTANTE: declarar ANTES del wildcard /grupos/{grupo}
    Route::get('/grupos/{grupo}/calificaciones',                          [CalificacionController::class, 'porGrupo']);
    Route::get('/grupos/{grupo}/acta-calificaciones/pdf',                 [ActaCalificacionesController::class, 'pdf']);
    Route::patch('/grupos/{grupo}/acta-calificaciones/firmar',            [ActaCalificacionesController::class, 'firmar']);
    Route::post('/calificaciones',                                        [CalificacionController::class, 'store']);

    // Cierre de curso
    Route::post('/cierres-de-curso',                                      [CierreDeCursoController::class, 'store']);
    Route::get('/alertas-baja-definitiva',                                [AlertaBajaDefinitivaController::class, 'index']);
    Route::patch('/alertas-baja-definitiva/{alerta}/revisar',             [AlertaBajaDefinitivaController::class, 'revisar']);

    // Situación académica del alumno (S4-06)
    Route::get('/alumnos/{alumno}/situacion-academica',                   [CalificacionController::class, 'situacionAcademica']);

    // ── Sprint 5 — Calidad Educativa ──────────────────────────────────────────

    // Catálogo de tipos de actividad complementaria (12 tipos oficiales TecNM)
    Route::get('/tipos-actividad',                                         [TipoActividadController::class, 'index']);

    // Actividades complementarias (S5-01, S5-02)
    Route::get('/actividades-complementarias',                             [ActividadComplementariaController::class, 'index']);
    Route::post('/actividades-complementarias',                            [ActividadComplementariaController::class, 'store']);
    Route::post('/actividades-complementarias/{actividad}/evidencia',      [ActividadComplementariaController::class, 'subirEvidencia']);
    Route::patch('/actividades-complementarias/{actividad}/validar',       [ActividadComplementariaController::class, 'validar']);
    Route::delete('/actividades-complementarias/{actividad}',              [ActividadComplementariaController::class, 'destroy']);

    // Evaluaciones docentes anónimas (S5-03, S5-04)
    // resultados ANTES del wildcard para evitar conflicto de rutas
    Route::get('/evaluaciones-docentes/resultados',                        [EvaluacionDocenteController::class, 'resultados']);
    Route::get('/evaluaciones-docentes',                                   [EvaluacionDocenteController::class, 'index']);
    Route::post('/evaluaciones-docentes',                                  [EvaluacionDocenteController::class, 'store']);
});

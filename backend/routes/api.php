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
use App\Http\Controllers\Academico\CierreDeCursoController;
use App\Http\Controllers\Academico\ActaCalificacionesController;
use App\Http\Controllers\Academico\AlertaBajaDefinitivaController;
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
    Route::get('/alumnos/{alumno}/expediente',               [AlumnoController::class, 'expediente']); // S11-03

    // Cobros CFDI — S1-11
    Route::post('/cobros-inscripcion',                       [CobroInscripcionController::class, 'store']);
    Route::get('/cobros-inscripcion/{recibo}/recibo/pdf',    [CobroInscripcionController::class, 'reciboPdf']);

    // Credencial — S1-12
    Route::get('/inscripciones/{inscripcion}/credencial/pdf',[InscripcionPdfController::class, 'credencial']);

    // Libro Registro NC — S1-13
    Route::get('/libro-registro-nc',                                          [InscripcionPdfController::class, 'libroRegistroNc']);
    Route::get('/alumnos/{alumno}/carga-academica/{periodo}/pdf',             [InscripcionPdfController::class, 'cargaAcademica']);
    Route::get('/grupos/{grupo}/carga-academica/{periodo}/pdf',               [InscripcionPdfController::class, 'cargaAcademicaGrupo']);

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

    // Fichas docentes (S11-04)
    Route::get('/docentes/fichas',                                 [FichaDocenteController::class, 'index']);
    Route::post('/docentes/fichas',                                [FichaDocenteController::class, 'store']);
    Route::patch('/docentes/{docente}/ficha',                      [FichaDocenteController::class, 'update']);

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

    // Aulas (S11-01)
    Route::get('/aulas',                                           [AulaController::class, 'index']);
    Route::get('/aulas/disponibles',                               [AulaController::class, 'disponibles']);
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
    Route::get('/horarios-trabajo',                                               [HorarioTrabajoController::class, 'index']);
    Route::get('/horarios-trabajo/mio',                                           [HorarioTrabajoController::class, 'mio']);
    Route::post('/horarios-trabajo',                                              [HorarioTrabajoController::class, 'store']);
    Route::get('/horarios-trabajo/{horarioTrabajo}',                              [HorarioTrabajoController::class, 'show']);

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

    // ── Sprint 6 — Vinculación Institucional ─────────────────────────────────

    // Servicio Social (S6-01, S6-02, S6-03)
    Route::get('/servicio-social',                                         [ServicioSocialController::class, 'index']);
    Route::post('/servicio-social',                                        [ServicioSocialController::class, 'store']);
    Route::patch('/servicio-social/{servicioSocial}/estatus',              [ServicioSocialController::class, 'actualizarEstatus']);

    // Verificar prerrequisitos para RP (S6-06)
    Route::get('/alumnos/{alumno}/verificar-prerequisitos-residencia',     [ServicioSocialController::class, 'verificarPrerequisitosResidencia']);

    // Solicitudes de Residencia Profesional (S6-06)
    Route::get('/solicitudes-rp',                                                      [SolicitudRpController::class, 'index']);
    Route::post('/solicitudes-rp',                                                     [SolicitudRpController::class, 'store']);
    Route::get('/solicitudes-rp/{solicitudRp}/carta-presentacion/pdf',                 [SolicitudRpController::class, 'cartaPresentacionPdf']);

    // Informes Semestrales del Asesor (S6-10 — TecNM-AC-PO-004-06)
    Route::get('/informes-semestral-asesor',  [InformeSemestralAsesorController::class, 'index']);
    Route::post('/informes-semestral-asesor', [InformeSemestralAsesorController::class, 'store']);

    // Dictamen de anteproyecto (S6-07)
    Route::post('/dictamenes-anteproyecto',                                [DictamenAnteproyectoController::class, 'store']);
    Route::get('/dictamenes-anteproyecto/{dictamenAnteproyecto}/pdf',      [DictamenAnteproyectoController::class, 'pdf']);

    // Residencias profesionales (S6-04, S6-08, S6-10, S6-11)
    Route::get('/residencias',                                             [ResidenciaProfesionalController::class, 'index']);
    Route::post('/residencias',                                            [ResidenciaProfesionalController::class, 'store']);
    Route::patch('/residencias/{residenciaProfesional}/asesor',            [ResidenciaProfesionalController::class, 'asignarAsesor']);
    Route::get('/residencias/{residenciaProfesional}/oficio-asesor/pdf',   [ResidenciaProfesionalController::class, 'oficioAsesorPdf']);
    Route::patch('/residencias/{residenciaProfesional}/seguimiento',       [ResidenciaProfesionalController::class, 'registrarSeguimiento']);
    Route::patch('/residencias/{residenciaProfesional}/evaluacion-reporte',[ResidenciaProfesionalController::class, 'evaluacionReporte']);

    // Asesorías RP (S6-09 — stub)
    Route::get('/asesorias-rp',                                            [AsesoriaRpController::class, 'index']);
    Route::post('/asesorias-rp',                                           [AsesoriaRpController::class, 'store']);

    // ── Sprint 7 — Cierre Académico y Salida Lateral ──────────────────────────

    // Modalidades de titulación (catálogo)
    Route::get('/modalidades-titulacion', [ModalidadTitulacionController::class, 'index']);

    // Certificados de idioma (S7-05)
    Route::get('/certificados-idioma',                                     [CertificadoIdiomaController::class, 'index']);
    Route::post('/certificados-idioma',                                    [CertificadoIdiomaController::class, 'store']);
    Route::patch('/certificados-idioma/{certificadoIdioma}/validar',       [CertificadoIdiomaController::class, 'validar']);

    // Solicitudes de Acto Protocolario (S7-03, S7-04)
    Route::get('/solicitudes-acto-protocolario',                           [SolicitudActoProtocolarioController::class, 'index']);
    Route::post('/solicitudes-acto-protocolario',                          [SolicitudActoProtocolarioController::class, 'store']);
    Route::patch('/solicitudes-acto-protocolario/{solicitudActoProtocolario}/no-inconveniencia',
                                                                           [SolicitudActoProtocolarioController::class, 'emitirNoInconveniencia']);
    Route::get('/solicitudes-acto-protocolario/{solicitudActoProtocolario}/no-inconveniencia/pdf',
                                                                           [SolicitudActoProtocolarioController::class, 'noInconvenienciaPdf']);

    // Actos Protocolarios (S7-04)
    Route::post('/actos-protocolarios',                                    [ActoProtocolarioController::class, 'store']);
    Route::get('/actos-protocolarios/{actoProtocolario}/aviso/pdf',        [ActoProtocolarioController::class, 'avisoPdf']);
    Route::patch('/actos-protocolarios/{actoProtocolario}/resultado',      [ActoProtocolarioController::class, 'registrarResultado']);
    Route::get('/actos-protocolarios/{actoProtocolario}/acta/pdf',         [ActoProtocolarioController::class, 'actaPdf']);
    Route::get('/actos-protocolarios/{actoProtocolario}/constancia-exencion/pdf',
                                                                           [ActoProtocolarioController::class, 'constanciaExencionPdf']);

    // Salida Lateral (S7-06, S7-07)
    Route::get('/salida-lateral',                                          [SalidaLateralController::class, 'index']);
    Route::post('/salida-lateral',                                         [SalidaLateralController::class, 'store']);
    Route::patch('/salida-lateral/{salidaLateral}/estatus',                [SalidaLateralController::class, 'actualizarEstatus']);
    Route::get('/salida-lateral/{salidaLateral}/diploma/pdf',              [SalidaLateralController::class, 'diplomaPdf']);

    // ── Sprint 10 — Gestión de Personal Docente (TecNM-AC-PO-005) ───────────────
    // Tipos de solicitud (catálogo)
    Route::get('/tipos-solicitud-personal',                              [SolicitudPersonalController::class, 'tipos']);

    // Solicitudes de permiso/licencia (S10-01/S10-02/S10-04)
    Route::get('/solicitudes-personal',                                  [SolicitudPersonalController::class, 'index']);
    Route::post('/solicitudes-personal',                                 [SolicitudPersonalController::class, 'store']);
    Route::patch('/solicitudes-personal/{solicitudPersonal}/resolver',   [SolicitudPersonalController::class, 'resolver']);
    Route::get('/solicitudes-personal/{solicitudPersonal}/documento/pdf',[SolicitudPersonalController::class, 'documentoPdf']);
    Route::get('/personal/{personalId}/historial',                       [SolicitudPersonalController::class, 'historial']);

    // Comisiones (S10-03)
    Route::get('/comisiones',                                            [ComisionController::class, 'index']);
    Route::post('/comisiones',                                           [ComisionController::class, 'store']);
    Route::get('/comisiones/{comision}/oficio/pdf',                      [ComisionController::class, 'oficioPdf']);

    // Cursos de Capacitación AP/FD (S10-07/S10-08)
    Route::get('/cursos-capacitacion',                                           [CursoCapacitacionController::class, 'index']);
    Route::post('/cursos-capacitacion',                                          [CursoCapacitacionController::class, 'store']);
    Route::patch('/cursos-capacitacion/{cursoCapacitacion}',                     [CursoCapacitacionController::class, 'update']);
    Route::get('/cursos-capacitacion/{cursoCapacitacion}/inscripciones',         [CursoCapacitacionController::class, 'inscripciones']);
    Route::post('/cursos-capacitacion/{cursoCapacitacion}/inscripciones',        [CursoCapacitacionController::class, 'inscribir']);
    Route::get('/cursos-capacitacion/{cursoCapacitacion}/lista-asistencia/pdf',  [AsistenciaCapacitacionController::class, 'listaAsistenciaPdf']);
    Route::get('/cedulas-inscripcion/{cedulaInscripcion}/pdf',                   [CursoCapacitacionController::class, 'cedulaPdf']);

    // Asistencias de Capacitación (S10-09)
    Route::get('/asistencias-capacitacion',  [AsistenciaCapacitacionController::class, 'index']);
    Route::post('/asistencias-capacitacion', [AsistenciaCapacitacionController::class, 'store']);

    // Evaluaciones de Seguimiento Capacitación (S10-10)
    Route::get('/evaluaciones-seguimiento-capacitacion',  [EvaluacionSeguimientoCapController::class, 'index']);
    Route::post('/evaluaciones-seguimiento-capacitacion', [EvaluacionSeguimientoCapController::class, 'store']);

    // Registro General Capacitación (S10-11)
    Route::get('/registro-general-capacitacion',          [AsistenciaCapacitacionController::class, 'registroGeneral']);
    Route::get('/registro-general-capacitacion/pdf',      [AsistenciaCapacitacionController::class, 'registroGeneralPdf']);

    // ── Sprint 9 — Planeación Académica (TecNM-AC-PO-003 / PO-007) ──────────────
    // Asignaciones docentes (S9-01/S9-02)
    Route::get('/asignaciones-docentes',                                 [AsignacionDocenteController::class, 'index']);
    Route::post('/asignaciones-docentes',                                [AsignacionDocenteController::class, 'store']);
    Route::get('/asignaciones-docentes/{carrera_id}',                    [AsignacionDocenteController::class, 'index']);
    Route::patch('/asignaciones-docentes/{asignacionDocente}',           [AsignacionDocenteController::class, 'update']);
    Route::get('/docentes/{docenteId}/carga-horaria',                    [AsignacionDocenteController::class, 'cargaHoraria']);

    // Especialidades (S9-06)
    Route::get('/especialidades',                                                     [EspecialidadController::class, 'index']);
    Route::post('/especialidades',                                                    [EspecialidadController::class, 'store']);
    Route::patch('/especialidades/{especialidad}',                                    [EspecialidadController::class, 'update']);
    Route::patch('/especialidades/{especialidad}/autorizar',                          [EspecialidadController::class, 'autorizar']);
    Route::get('/especialidades/{especialidad}/oficio/pdf',                           [EspecialidadController::class, 'oficio']);
    Route::get('/programas-educativos/{carrera}/especialidades',                      [EspecialidadController::class, 'porCarrera']);
    Route::post('/solicitudes-apertura-especialidad',                                 [EspecialidadController::class, 'solicitarApertura']);
    Route::patch('/solicitudes-apertura-especialidad/{solicitud}/dictaminar',         [EspecialidadController::class, 'dictaminar']);
    Route::post('/alumnos/{alumno}/especialidad-seleccionada',                        [EspecialidadController::class, 'seleccionar']);

    // Instrumentaciones didácticas (S9-03/S9-04/S9-05)
    Route::get('/instrumentaciones-didacticas',                                      [InstrumentacionDidacticaController::class, 'index']);
    Route::post('/instrumentaciones-didacticas',                                     [InstrumentacionDidacticaController::class, 'store']);
    Route::patch('/instrumentaciones-didacticas/{instrumentacionDidactica}',         [InstrumentacionDidacticaController::class, 'update']);
    Route::patch('/instrumentaciones-didacticas/{instrumentacionDidactica}/enviar',  [InstrumentacionDidacticaController::class, 'enviar']);
    Route::patch('/instrumentaciones-didacticas/{instrumentacionDidactica}/liberar', [InstrumentacionDidacticaController::class, 'liberar']);
    Route::patch('/instrumentaciones-didacticas/{instrumentacionDidactica}/visto-bueno',
                                                                                     [InstrumentacionDidacticaController::class, 'vistoBueno']);

    // ── Sprint 8 — Inteligencia Analítica ────────────────────────────────────────
    Route::get('/indicadores/desercion',           [IndicadoresController::class, 'desercion']);
    Route::get('/indicadores/retencion',           [IndicadoresController::class, 'retencion']);
    Route::get('/indicadores/eficiencia-terminal', [IndicadoresController::class, 'eficienciaTerminal']);
    Route::get('/indicadores/promedio',            [IndicadoresController::class, 'promedio']);

    // ── Sprint 12 — Asistencia y Seguimiento Académico ───────────────────────────
    Route::get('/sesiones-clase',                                      [SesionClaseController::class, 'index']);
    Route::post('/sesiones-clase',                                     [SesionClaseController::class, 'store']);
    Route::get('/sesiones-clase/{sesionClase}',                        [SesionClaseController::class, 'show']);
    Route::patch('/sesiones-clase/{sesionClase}/asistencia',           [SesionClaseController::class, 'actualizarAsistencia']);
    Route::get('/grupos/{grupo}/reporte-asistencia',                   [SesionClaseController::class, 'reporteAsistenciaGrupo']);
    Route::get('/alumnos/{alumnoId}/asistencia',                       [SesionClaseController::class, 'asistenciaAlumno']);
    Route::get('/alertas/inasistencias',                               [AlertaInasistenciaController::class, 'index']);
    Route::patch('/alertas/inasistencias/{alerta}/leer',               [AlertaInasistenciaController::class, 'marcarLeida']);
    Route::get('/reportes/carga-academica',                            [SesionClaseController::class, 'reporteCargaAcademica']);

    // ── Sprint 13 — Reportes Directivos y Egresados ──────────────────────────────
    // Egresados (S13-01)
    Route::get('/egresados',                [EgresadoController::class, 'index']);
    Route::post('/egresados',               [EgresadoController::class, 'store']);
    Route::patch('/egresados/{egresado}',   [EgresadoController::class, 'update']);

    // Reportes PDF directivos (S13-02, S13-03, S13-04)
    Route::get('/reportes/matricula/pdf',             [ReporteDirectivoController::class, 'matriculaPdf']);
    Route::get('/reportes/calificaciones/pdf',        [ReporteDirectivoController::class, 'calificacionesPdf']);
    Route::get('/reportes/directorio/{tipo}/pdf',     [ReporteDirectivoController::class, 'directorioPdf']);

    // Dashboard asistencia institucional (S13-05)
    Route::get('/indicadores/asistencia',                     [IndicadoresAsistenciaController::class, 'dashboard']);
    Route::get('/indicadores/asistencia/carrera/{carreraId}', [IndicadoresAsistenciaController::class, 'porCarrera']);

    // ── Sprint 14 — Programa Institucional de Tutoría ─────────────────────────────
    Route::get('/asignaciones-tutoria',                        [AsignacionTutoriaController::class, 'index']);
    Route::post('/asignaciones-tutoria',                       [AsignacionTutoriaController::class, 'store']);
    Route::patch('/asignaciones-tutoria/{asignacion}',         [AsignacionTutoriaController::class, 'update']);
    Route::get('/sesiones-tutoria',                            [SesionTutoriaController::class, 'index']);
    Route::post('/sesiones-tutoria',                           [SesionTutoriaController::class, 'store']);
    Route::get('/sesiones-tutoria/{tutorId}',                  [SesionTutoriaController::class, 'porTutor']);
    Route::get('/planes-accion-tutorial',                      [PlanAccionTutorialController::class, 'index']);
    Route::post('/planes-accion-tutorial',                     [PlanAccionTutorialController::class, 'store']);
    Route::patch('/planes-accion-tutorial/{plan}/estatus',     [PlanAccionTutorialController::class, 'updateEstatus']);
    Route::get('/indicadores/tutoria',                         [IndicadoresTutoriaController::class, 'dashboard']);

    // ── Sprint 15 — Traslado, Convalidación y Equivalencia ────────────────────────
    Route::get('/traslados',                                   [TrasladoController::class, 'index']);
    Route::post('/traslados',                                  [TrasladoController::class, 'store']);
    Route::patch('/traslados/{traslado}/gestionar',            [TrasladoController::class, 'gestionar']);
    Route::get('/traslados/{traslado}/kardex/pdf',             [TrasladoController::class, 'kardexPdf']);
    Route::get('/convalidaciones',                             [ConvalidacionController::class, 'index']);
    Route::post('/convalidaciones',                            [ConvalidacionController::class, 'store']);
    Route::get('/equivalencias',                               [EquivalenciaController::class, 'index']);
    Route::post('/equivalencias',                              [EquivalenciaController::class, 'store']);
    Route::get('/alumnos/{alumno}/historial-academico',        [AlumnoController::class, 'historialAcademico']);

    // ── Sprint 16 — Movilidad Estudiantil y Cursos de Verano ──────────────────────
    Route::get('/convenios-movilidad',                             [ConvenioMovilidadController::class, 'index']);
    Route::post('/convenios-movilidad',                            [ConvenioMovilidadController::class, 'store']);
    Route::get('/movilidad-estudiantil',                           [MovilidadEstudiantilController::class, 'index']);
    Route::post('/movilidad-estudiantil',                          [MovilidadEstudiantilController::class, 'store']);
    Route::patch('/movilidad-estudiantil/{movilidad}/calificaciones', [MovilidadEstudiantilController::class, 'registrarCalificaciones']);
    Route::get('/cursos-verano',                                   [CursoVeranoController::class, 'index']);
    Route::post('/cursos-verano',                                  [CursoVeranoController::class, 'store']);
    Route::post('/cursos-verano/{cursoVerano}/inscripciones',      [CursoVeranoController::class, 'inscribir']);
    Route::patch('/cursos-verano/{cursoVerano}/cerrar',            [CursoVeranoController::class, 'cerrar']);

    // ── Sprint 17 — Educación a Distancia (TecNM Cap. 16) ────────────────────────
    Route::get('/programas-distancia',                             [ProgramaDistanciaController::class, 'index']);
    Route::post('/programas-distancia',                            [ProgramaDistanciaController::class, 'store']);
    Route::post('/inscripciones-distancia',                        [InscripcionDistanciaController::class, 'store']);
    Route::get('/alumnos/{alumno}/avance-distancia',               [AlumnoController::class, 'avanceDistancia']);
    Route::get('/seguimiento-distancia',                           [EducacionDistanciaController::class, 'seguimiento']);
    Route::get('/indicadores/distancia',                           [EducacionDistanciaController::class, 'indicadores']);

    // ── Sprint 18 — Catálogo de Personal Sindicalizado ────────────────────────────
    Route::get('/docentes/{docente}/ficha-sindical',               [FichaSindicalController::class, 'show']);
    Route::post('/docentes/{docente}/ficha-sindical',              [FichaSindicalController::class, 'store']);
    Route::get('/plazas',                                          [PlazaController::class, 'index']);
    Route::post('/plazas/{plaza}/movimientos',                     [PlazaController::class, 'registrarMovimiento']);
    Route::get('/reportes/plantilla-sindical/pdf',                 [PlantillaSindicalController::class, 'pdf']);

    // ── Sprint 19 — Permisos Sindicales y Escalafón ───────────────────────────────
    Route::get('/permisos-sindicales',                                     [PermisoSindicalController::class, 'index']);
    Route::post('/permisos-sindicales',                                    [PermisoSindicalController::class, 'store']);
    Route::get('/permisos-sindicales/{permiso}/oficio-pdf',                [PermisoSindicalController::class, 'oficio']);
    Route::get('/docentes/{docente}/historial-escalafon',                  [FichaSindicalController::class, 'historialEscalafon']);
    Route::get('/concursos-oposicion',                                     [ConcursoOposicionController::class, 'index']);
    Route::post('/concursos-oposicion',                                    [ConcursoOposicionController::class, 'store']);
    Route::get('/reportes/permisos-sindicales/{periodo}/pdf',              [InformeSindicalController::class, 'pdf']);
    Route::get('/dashboard/ausentismo-sindical',                           [AusentismoSindicalController::class, 'dashboard']);

    // ── Sprint 20 — Convocatorias Institucionales ─────────────────────────────────
    Route::get('/convocatorias',                                               [ConvocatoriaController::class, 'index']);
    Route::post('/convocatorias',                                              [ConvocatoriaController::class, 'store']);
    Route::get('/convocatorias/{convocatoria}',                                [ConvocatoriaController::class, 'show']);
    Route::patch('/convocatorias/{convocatoria}/estatus',                      [ConvocatoriaController::class, 'updateEstatus']);
    Route::post('/convocatorias/{convocatoria}/publicar-resultados',           [ConvocatoriaController::class, 'publicarResultados']);
    Route::get('/convocatorias/{convocatoria}/postulaciones',                  [PostulacionController::class, 'indexPorConvocatoria']);
    Route::post('/convocatorias/{convocatoria}/postulaciones',                 [PostulacionController::class, 'store']);
    Route::patch('/postulaciones/{postulacion}/estatus',                       [PostulacionController::class, 'updateEstatus']);
    Route::get('/users/{user}/postulaciones',                                  [PostulacionController::class, 'misPostulaciones']);
});

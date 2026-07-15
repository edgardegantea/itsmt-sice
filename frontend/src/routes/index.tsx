import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import Layout from '../layouts/Layout'
import AlumnoLayout from '../layouts/AlumnoLayout'

// ── Lazy pages ────────────────────────────────────────────────────────────────

const LoginPage             = lazy(() => import('../features/auth/pages/LoginPage'))
const ForgotPasswordPage    = lazy(() => import('../features/auth/pages/ForgotPasswordPage'))
const ResetPasswordPage     = lazy(() => import('../features/auth/pages/ResetPasswordPage'))
const RegistroAspirantePage = lazy(() => import('../features/admision/pages/RegistroAspirantePage'))
const AspirantesPage        = lazy(() => import('../features/admision/pages/AspirantesPage'))
const AspiranteDetailPage   = lazy(() => import('../features/admision/pages/AspiranteDetailPage'))
const AlumnosPage           = lazy(() => import('../features/admision/pages/AlumnosPage'))
const AlumnoDetailPage      = lazy(() => import('../features/admision/pages/AlumnoDetailPage'))
const DashboardAdminPage    = lazy(() => import('../features/admin/pages/DashboardAdminPage'))
const PeriodosPage          = lazy(() => import('../features/admin/pages/PeriodosPage'))
const CarrerasPage          = lazy(() => import('../features/admin/pages/CarrerasPage'))
const CatalogosPage         = lazy(() => import('../features/admin/pages/CatalogosPage'))
const ConfiguracionPage     = lazy(() => import('../features/admin/pages/ConfiguracionPage'))
const DashboardAlumnoPage         = lazy(() => import('../features/alumno/pages/DashboardAlumnoPage'))
const PrecargaAcademicaPage       = lazy(() => import('../features/alumno/pages/PrecargaAcademicaPage'))
const ConsultaAspirantePage    = lazy(() => import('../features/admision/pages/ConsultaAspirantePage'))
const TramitesAlumnoPage       = lazy(() => import('../features/permanencia/pages/TramitesAlumnoPage'))
const ReinscripcionesAdminPage        = lazy(() => import('../features/permanencia/pages/ReinscripcionesAdminPage'))
const ConstanciasAdminPage            = lazy(() => import('../features/permanencia/pages/ConstanciasAdminPage'))
const EncuestaSocioeconomicaPage      = lazy(() => import('../features/permanencia/pages/EncuestaSocioeconomicaPage'))
const EncuestasAdminPage              = lazy(() => import('../features/permanencia/pages/EncuestasAdminPage'))
const UsuariosPage                    = lazy(() => import('../features/admin/pages/UsuariosPage'))
const UsuarioDetailPage               = lazy(() => import('../features/admin/pages/UsuarioDetailPage'))
const DirectorioPage                  = lazy(() => import('../features/admin/pages/DirectorioPage'))
const PermisosPage                    = lazy(() => import('../features/admin/pages/PermisosPage'))
const GestionAcademicaPage            = lazy(() => import('../features/academico/pages/GestionAcademicaPage'))
const GestionAcademicaIndexPage       = lazy(() => import('../features/academico/pages/GestionAcademicaIndexPage'))
const MateriasPage                    = lazy(() => import('../features/academico/pages/secciones/MateriasPage'))
const DocentesPage                    = lazy(() => import('../features/academico/pages/secciones/DocentesPage'))
const MallaPage                       = lazy(() => import('../features/academico/pages/secciones/MallaPage'))
const GruposPage                      = lazy(() => import('../features/academico/pages/secciones/GruposPage'))
const GrupoDetailPage                 = lazy(() => import('../features/academico/pages/secciones/GrupoDetailPage'))
const AulasPage                       = lazy(() => import('../features/academico/pages/secciones/AulasPage'))
const ExpedienteAlumnoPage            = lazy(() => import('../features/academico/pages/ExpedienteAlumnoPage'))
const FichasDocentesPage              = lazy(() => import('../features/academico/pages/FichasDocentesPage'))
const AsistenciasPage                 = lazy(() => import('../features/academico/pages/AsistenciasPage'))
const AlertasInasistenciaPage         = lazy(() => import('../features/academico/pages/AlertasInasistenciaPage'))
const CargaAcademicaPersonalPage      = lazy(() => import('../features/academico/pages/CargaAcademicaPersonalPage'))
const CargasPage                      = lazy(() => import('../features/academico/pages/secciones/CargasPage'))
const CargaBuilderPage                = lazy(() => import('../features/academico/pages/secciones/CargaBuilderPage'))
const HorariosPage                    = lazy(() => import('../features/academico/pages/secciones/HorariosPage'))
const PlaneacionesPage                = lazy(() => import('../features/academico/pages/secciones/PlaneacionesPage'))
const TutoriasPage                    = lazy(() => import('../features/academico/pages/secciones/TutoriasPage'))
const FuncionesPage                   = lazy(() => import('../features/academico/pages/secciones/FuncionesPage'))
const CargaAcademicaAdminPage         = lazy(() => import('../features/academico/pages/CargaAcademicaAdminPage'))
const PlaneacionDocentePage           = lazy(() => import('../features/academico/pages/PlaneacionDocentePage'))
const ActividadesComplementariasPage  = lazy(() => import('../features/calidad/pages/ActividadesComplementariasPage'))
const EvaluacionDocentePage           = lazy(() => import('../features/calidad/pages/EvaluacionDocentePage'))
const ResultadosEvaluacionPage        = lazy(() => import('../features/calidad/pages/ResultadosEvaluacionPage'))
const BajasAdminPage                  = lazy(() => import('../features/permanencia/pages/BajasAdminPage'))
const AlertasPage                     = lazy(() => import('../features/academico/pages/AlertasPage'))
const ServicioSocialAdminPage         = lazy(() => import('../features/vinculacion/pages/ServicioSocialAdminPage'))
const SolicitudesRpAdminPage          = lazy(() => import('../features/vinculacion/pages/SolicitudesRpAdminPage'))
const ResidenciasAdminPage            = lazy(() => import('../features/vinculacion/pages/ResidenciasAdminPage'))
const VinculacionAlumnoPage           = lazy(() => import('../features/vinculacion/pages/VinculacionAlumnoPage'))
const CertificadosIdiomaAdminPage     = lazy(() => import('../features/titulacion/pages/CertificadosIdiomaAdminPage'))
const SolicitudesActoAdminPage        = lazy(() => import('../features/titulacion/pages/SolicitudesActoAdminPage'))
const SalidaLateralAdminPage          = lazy(() => import('../features/titulacion/pages/SalidaLateralAdminPage'))
const TitulacionAlumnoPage            = lazy(() => import('../features/titulacion/pages/TitulacionAlumnoPage'))
const IndicadoresPage                 = lazy(() => import('../features/analitica/pages/IndicadoresPage'))
const AsignacionesDocentesPage        = lazy(() => import('../features/planeacion/pages/AsignacionesDocentesPage'))
const InstrumentacionDidacticaPage    = lazy(() => import('../features/planeacion/pages/InstrumentacionDidacticaPage'))
const SolicitudesPersonalPage         = lazy(() => import('../features/personal/pages/SolicitudesPersonalPage'))
const ComisionesPage                  = lazy(() => import('../features/personal/pages/ComisionesPage'))
const CursosCapacitacionPage          = lazy(() => import('../features/capacitacion/pages/CursosCapacitacionPage'))
const LibroRegistroNcPage             = lazy(() => import('../features/admision/pages/LibroRegistroNcPage'))
const AsesoriasRpPage                 = lazy(() => import('../features/vinculacion/pages/AsesoriasRpPage'))
const EgresadosPage                   = lazy(() => import('../features/academico/pages/EgresadosPage'))
const ReportesDirectivosPage          = lazy(() => import('../features/academico/pages/ReportesDirectivosPage'))
const DashboardAsistenciaPage         = lazy(() => import('../features/academico/pages/DashboardAsistenciaPage'))
const DashboardTutoriaPage            = lazy(() => import('../features/academico/pages/DashboardTutoriaPage'))
const PitAdminPage                    = lazy(() => import('../features/academico/pages/PitAdminPage'))
const SesionesTutoriaPage             = lazy(() => import('../features/academico/pages/SesionesTutoriaPage'))
const PlanAccionTutorialPage          = lazy(() => import('../features/academico/pages/PlanAccionTutorialPage'))
const TrasladosPage                   = lazy(() => import('../features/academico/pages/TrasladosPage'))
const ConvalidacionesPage             = lazy(() => import('../features/academico/pages/ConvalidacionesPage'))
const EquivalenciasPage               = lazy(() => import('../features/academico/pages/EquivalenciasPage'))
const ConveniosMovilidadPage          = lazy(() => import('../features/academico/pages/ConveniosMovilidadPage'))
const MovilidadEstudiantilPage        = lazy(() => import('../features/academico/pages/MovilidadEstudiantilPage'))
const CursosVeranoPage                = lazy(() => import('../features/academico/pages/CursosVeranoPage'))
const ProgramasDistanciaPage          = lazy(() => import('../features/academico/pages/ProgramasDistanciaPage'))
const SeguimientoDistanciaPage        = lazy(() => import('../features/academico/pages/SeguimientoDistanciaPage'))
const FichasSindicalesPage            = lazy(() => import('../features/academico/pages/FichasSindicalesPage'))
const PermisosSindicalesPage          = lazy(() => import('../features/academico/pages/PermisosSindicalesPage'))
const ConcursosOposicionPage          = lazy(() => import('../features/academico/pages/ConcursosOposicionPage'))
const ConvocatoriasPage               = lazy(() => import('../features/convocatoria/pages/ConvocatoriasPage'))
const MisPostulacionesPage            = lazy(() => import('../features/convocatoria/pages/MisPostulacionesPage'))

// Sprint 21-25
const CalendarioEscolarPage           = lazy(() => import('../features/reinscripcion/pages/CalendarioEscolarPage'))

// Builder de Horarios (integración propuestahorarios)
const DisponibilidadDocentePage       = lazy(() => import('../features/academico/pages/DisponibilidadDocentePage'))
const BuilderHorarioPage              = lazy(() => import('../features/academico/pages/BuilderHorarioPage'))
const MiHorarioDocentePage            = lazy(() => import('../features/academico/pages/MiHorarioDocentePage'))
const EstadoCuentaAdminPage           = lazy(() => import('../features/finanzas/pages/EstadoCuentaAdminPage'))
const BecasAdminPage                  = lazy(() => import('../features/becas/pages/BecasAdminPage'))
const BecasAlumnoPage                 = lazy(() => import('../features/becas/pages/BecasAlumnoPage'))
const BibliotecaPage                  = lazy(() => import('../features/biblioteca/pages/BibliotecaPage'))
const CalidadPage                     = lazy(() => import('../features/calidadiso/pages/CalidadPage'))

// ── Wrappers ──────────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'personal_administrativo']

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={ADMIN_ROLES}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

const Loader = () => (
  <div className="flex items-center justify-center min-h-screen text-slate-400 text-sm">
    Cargando…
  </div>
)

// ── Router ────────────────────────────────────────────────────────────────────

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Públicas */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/registro"           element={<RegistroAspirantePage />} />
        <Route path="/aspirante/consulta" element={<ConsultaAspirantePage />} />

        {/* Admin */}
        <Route path="/admin"            element={<AdminLayout><DashboardAdminPage /></AdminLayout>} />
        <Route path="/admin/aspirantes"     element={<AdminLayout><AspirantesPage /></AdminLayout>} />
        <Route path="/admin/aspirantes/:id" element={<AdminLayout><AspiranteDetailPage /></AdminLayout>} />
        <Route path="/admin/alumnos"                  element={<AdminLayout><AlumnosPage /></AdminLayout>} />
        <Route path="/admin/alumnos/:id"              element={<AdminLayout><AlumnoDetailPage /></AdminLayout>} />
        <Route path="/admin/alumnos/:id/expediente"   element={<AdminLayout><ExpedienteAlumnoPage /></AdminLayout>} />
        <Route path="/admin/libro-registro-nc"        element={<AdminLayout><LibroRegistroNcPage /></AdminLayout>} />
        <Route path="/admin/periodos"   element={<AdminLayout><PeriodosPage /></AdminLayout>} />
        <Route path="/admin/carreras"   element={<AdminLayout><CarrerasPage /></AdminLayout>} />
        <Route path="/admin/catalogos"        element={<AdminLayout><CatalogosPage /></AdminLayout>} />
        <Route path="/admin/configuracion"  element={<AdminLayout><ConfiguracionPage /></AdminLayout>} />
        <Route path="/admin/reinscripciones"          element={<AdminLayout><ReinscripcionesAdminPage /></AdminLayout>} />
        <Route path="/admin/constancias"             element={<AdminLayout><ConstanciasAdminPage /></AdminLayout>} />
        <Route path="/admin/encuestas-socioeconomicas" element={<AdminLayout><EncuestasAdminPage /></AdminLayout>} />
        <Route path="/admin/bajas"                   element={<AdminLayout><BajasAdminPage /></AdminLayout>} />
        <Route path="/admin/alertas-baja-definitiva" element={<AdminLayout><AlertasPage /></AdminLayout>} />
        <Route path="/admin/usuarios"                  element={<AdminLayout><UsuariosPage /></AdminLayout>} />
        <Route path="/admin/usuarios/:id"              element={<AdminLayout><UsuarioDetailPage /></AdminLayout>} />
        <Route path="/admin/directorio"               element={<AdminLayout><DirectorioPage /></AdminLayout>} />
        <Route path="/admin/permisos"                  element={<AdminLayout><PermisosPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica"              element={<AdminLayout><GestionAcademicaIndexPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/materias"     element={<AdminLayout><MateriasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/docentes"     element={<AdminLayout><DocentesPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/malla"        element={<AdminLayout><MallaPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/grupos"       element={<AdminLayout><GruposPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/grupos/:id"   element={<AdminLayout><GrupoDetailPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/aulas"              element={<AdminLayout><AulasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/fichas-docentes"         element={<AdminLayout><FichasDocentesPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/asistencias"              element={<AdminLayout><AsistenciasPage /></AdminLayout>} />
        <Route path="/admin/alertas-inasistencia"                       element={<AdminLayout><AlertasInasistenciaPage /></AdminLayout>} />
        <Route path="/admin/reportes/carga-academica"                   element={<AdminLayout><CargaAcademicaPersonalPage /></AdminLayout>} />
        <Route path="/admin/egresados"                                  element={<AdminLayout><EgresadosPage /></AdminLayout>} />
        <Route path="/admin/reportes/directivos"                        element={<AdminLayout><ReportesDirectivosPage /></AdminLayout>} />
        <Route path="/admin/indicadores/asistencia"                     element={<AdminLayout><DashboardAsistenciaPage /></AdminLayout>} />
        <Route path="/admin/indicadores/tutoria"                        element={<AdminLayout><DashboardTutoriaPage /></AdminLayout>} />
        <Route path="/admin/pit/asignaciones"                           element={<AdminLayout><PitAdminPage /></AdminLayout>} />
        <Route path="/docente/pit/sesiones"                             element={<AdminLayout><SesionesTutoriaPage /></AdminLayout>} />
        <Route path="/docente/pit/pat"                                  element={<AdminLayout><PlanAccionTutorialPage /></AdminLayout>} />
        <Route path="/admin/traslados"                                  element={<AdminLayout><TrasladosPage /></AdminLayout>} />
        <Route path="/admin/convalidaciones"                            element={<AdminLayout><ConvalidacionesPage /></AdminLayout>} />
        <Route path="/admin/equivalencias"                              element={<AdminLayout><EquivalenciasPage /></AdminLayout>} />
        <Route path="/admin/convenios-movilidad"                        element={<AdminLayout><ConveniosMovilidadPage /></AdminLayout>} />
        <Route path="/admin/movilidad-estudiantil"                      element={<AdminLayout><MovilidadEstudiantilPage /></AdminLayout>} />
        <Route path="/admin/cursos-verano"                              element={<AdminLayout><CursosVeranoPage /></AdminLayout>} />
        <Route path="/admin/educacion-distancia/programas"              element={<AdminLayout><ProgramasDistanciaPage /></AdminLayout>} />
        <Route path="/admin/educacion-distancia/seguimiento"            element={<AdminLayout><SeguimientoDistanciaPage /></AdminLayout>} />
        <Route path="/admin/plazas-sindicales"                          element={<AdminLayout><FichasSindicalesPage /></AdminLayout>} />
        <Route path="/admin/permisos-sindicales"                        element={<AdminLayout><PermisosSindicalesPage /></AdminLayout>} />
        <Route path="/admin/concursos-oposicion"                        element={<AdminLayout><ConcursosOposicionPage /></AdminLayout>} />
        <Route path="/admin/convocatorias"                              element={<AdminLayout><ConvocatoriasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/cargas"       element={<AdminLayout><CargasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/cargas/builder" element={<AdminLayout><CargaBuilderPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/horarios"     element={<AdminLayout><HorariosPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/planeaciones" element={<AdminLayout><PlaneacionesPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/tutorias"     element={<AdminLayout><TutoriasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/funciones"    element={<AdminLayout><FuncionesPage /></AdminLayout>} />
        {/* Legacy tab view — kept for reference */}
        <Route path="/admin/gestion-academica/legacy"       element={<AdminLayout><GestionAcademicaPage /></AdminLayout>} />
        <Route path="/admin/carga-academica"           element={<AdminLayout><CargaAcademicaAdminPage /></AdminLayout>} />
        <Route path="/admin/horarios/builder"          element={<AdminLayout><BuilderHorarioPage /></AdminLayout>} />
        <Route path="/admin/horarios/disponibilidad"   element={<AdminLayout><DisponibilidadDocentePage /></AdminLayout>} />
        <Route path="/docente/planeacion"              element={<AdminLayout><PlaneacionDocentePage /></AdminLayout>} />
        <Route path="/docente/mi-horario"              element={<AdminLayout><MiHorarioDocentePage /></AdminLayout>} />
        <Route path="/docente/disponibilidad"          element={<AdminLayout><DisponibilidadDocentePage /></AdminLayout>} />

        {/* Portal Alumno */}
        <Route
          path="/alumno/dashboard"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AlumnoLayout><DashboardAlumnoPage /></AlumnoLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alumno/tramites"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AlumnoLayout><TramitesAlumnoPage /></AlumnoLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alumno/precarga-academica"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AlumnoLayout><PrecargaAcademicaPage /></AlumnoLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alumno/encuesta-socioeconomica"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AlumnoLayout><EncuestaSocioeconomicaPage /></AlumnoLayout>
            </ProtectedRoute>
          }
        />

        {/* Sprint 5 — Calidad Educativa */}
        <Route path="/admin/calidad/actividades-complementarias" element={<AdminLayout><ActividadesComplementariasPage /></AdminLayout>} />
        <Route path="/admin/calidad/evaluacion-docente/resultados" element={<AdminLayout><ResultadosEvaluacionPage /></AdminLayout>} />
        <Route
          path="/alumno/actividades-complementarias"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AlumnoLayout><ActividadesComplementariasPage /></AlumnoLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alumno/evaluacion-docente"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AlumnoLayout><EvaluacionDocentePage /></AlumnoLayout>
            </ProtectedRoute>
          }
        />

        {/* Sprint 6 — Vinculación Institucional */}
        <Route path="/admin/vinculacion/servicio-social" element={<AdminLayout><ServicioSocialAdminPage /></AdminLayout>} />
        <Route path="/admin/vinculacion/solicitudes-rp"  element={<AdminLayout><SolicitudesRpAdminPage /></AdminLayout>} />
        <Route path="/admin/vinculacion/residencias"     element={<AdminLayout><ResidenciasAdminPage /></AdminLayout>} />
        <Route path="/admin/vinculacion/asesorias-rp"   element={<AdminLayout><AsesoriasRpPage /></AdminLayout>} />
        <Route
          path="/alumno/vinculacion"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AlumnoLayout><VinculacionAlumnoPage /></AlumnoLayout>
            </ProtectedRoute>
          }
        />

        {/* Sprint 7 — Cierre Académico y Salida Lateral */}
        <Route path="/admin/titulacion/certificados-idioma" element={<AdminLayout><CertificadosIdiomaAdminPage /></AdminLayout>} />
        <Route path="/admin/titulacion/acto-protocolario"   element={<AdminLayout><SolicitudesActoAdminPage /></AdminLayout>} />
        <Route path="/admin/titulacion/salida-lateral"      element={<AdminLayout><SalidaLateralAdminPage /></AdminLayout>} />
        <Route
          path="/alumno/titulacion"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AlumnoLayout><TitulacionAlumnoPage /></AlumnoLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alumno/convocatorias"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AlumnoLayout><ConvocatoriasPage /></AlumnoLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alumno/mis-postulaciones"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AlumnoLayout><MisPostulacionesPage /></AlumnoLayout>
            </ProtectedRoute>
          }
        />

        {/* Sprint 8 — Analítica */}
        <Route path="/admin/analitica/indicadores" element={<AdminLayout><IndicadoresPage /></AdminLayout>} />

        {/* Sprint 9 — Planeación Académica */}
        <Route path="/admin/planeacion/asignaciones"      element={<AdminLayout><AsignacionesDocentesPage /></AdminLayout>} />
        <Route
          path="/admin/planeacion/instrumentaciones"
          element={
            <ProtectedRoute requiredRole={[...ADMIN_ROLES, 'docente', 'direccion_academica', 'subdireccion_academica']}>
              <Layout><InstrumentacionDidacticaPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Sprint 10 — Gestión de Personal Docente */}
        <Route path="/admin/personal/solicitudes"   element={<AdminLayout><SolicitudesPersonalPage /></AdminLayout>} />
        <Route path="/admin/personal/comisiones"    element={<AdminLayout><ComisionesPage /></AdminLayout>} />
        <Route path="/admin/capacitacion/cursos"    element={<AdminLayout><CursosCapacitacionPage /></AdminLayout>} />
        <Route
          path="/docente/capacitacion"
          element={
            <ProtectedRoute requiredRole={[...ADMIN_ROLES, 'docente', 'direccion_academica', 'subdireccion_academica']}>
              <Layout><CursosCapacitacionPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Placeholders futuros sprints */}
        {/* Sprint 21 — Reinscripción Oficial TecNM */}
        <Route path="/admin/calendario-escolar" element={<AdminLayout><CalendarioEscolarPage /></AdminLayout>} />

        {/* Sprint 22 — Finanzas y Estado de Cuenta */}
        <Route path="/admin/finanzas/estado-cuenta" element={<AdminLayout><EstadoCuentaAdminPage /></AdminLayout>} />

        {/* Sprint 23 — Becas TecNM */}
        <Route path="/admin/becas"  element={<AdminLayout><BecasAdminPage /></AdminLayout>} />
        <Route
          path="/alumno/becas"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AlumnoLayout><BecasAlumnoPage /></AlumnoLayout>
            </ProtectedRoute>
          }
        />

        {/* Sprint 24 — Biblioteca */}
        <Route path="/biblioteca" element={<AdminLayout><BibliotecaPage /></AdminLayout>} />

        {/* Sprint 25 — Acreditación y Calidad ISO/CACEI */}
        <Route path="/admin/calidad-iso" element={<AdminLayout><CalidadPage /></AdminLayout>} />

        <Route path="/docente" element={<ProtectedRoute requiredRole="docente"><div style={{padding:32}}>Portal Docente — Sprint 4</div></ProtectedRoute>} />
        <Route path="/sin-acceso" element={<div style={{padding:32,color:'#dc3545'}}>Sin permisos para acceder a esta sección.</div>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}

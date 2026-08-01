import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ADMIN_ROLES } from '../../routes/AdminLayout'
import { AdminLayout } from '../../routes/AdminLayout'
import Layout from '@/layouts/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'

const AlertasCorteCapturaPage = lazy(() => import('./pages/AlertasCorteCapturaPage'))
const AlertasInasistenciaPage = lazy(() => import('./pages/AlertasInasistenciaPage'))
const AlertasPage = lazy(() => import('./pages/AlertasPage'))
const AsistenciasPage = lazy(() => import('./pages/AsistenciasPage'))
const AulasPage = lazy(() => import('./pages/secciones/AulasPage'))
const BolsaTrabajoPage = lazy(() => import('./pages/BolsaTrabajoPage'))
const BuilderHorarioPage = lazy(() => import('./pages/BuilderHorarioPage'))
const BuscarDisponibilidadPage = lazy(() => import('./pages/secciones/BuscarDisponibilidadPage'))
const CalificacionesPage = lazy(() => import('./pages/secciones/CalificacionesPage'))
const CargaAcademicaAdminPage = lazy(() => import('./pages/CargaAcademicaAdminPage'))
const CargaAcademicaPersonalPage = lazy(() => import('./pages/CargaAcademicaPersonalPage'))
const CargaBuilderPage = lazy(() => import('./pages/secciones/CargaBuilderPage'))
const CargasPage = lazy(() => import('./pages/secciones/CargasPage'))
const ConcursosOposicionPage = lazy(() => import('./pages/ConcursosOposicionPage'))
const ConvalidacionesPage = lazy(() => import('./pages/ConvalidacionesPage'))
const ConveniosMovilidadPage = lazy(() => import('./pages/ConveniosMovilidadPage'))
const CursosVeranoPage = lazy(() => import('./pages/CursosVeranoPage'))
const DashboardAsistenciaPage = lazy(() => import('./pages/DashboardAsistenciaPage'))
const DashboardDocentePage = lazy(() => import('./pages/DashboardDocentePage'))
const DashboardJefeCarreraPage = lazy(() => import('./pages/DashboardJefeCarreraPage'))
const DashboardTutoriaPage = lazy(() => import('./pages/DashboardTutoriaPage'))
const DiagnosticoHorarioPage = lazy(() => import('./pages/secciones/DiagnosticoHorarioPage'))
const DisponibilidadDocentePage = lazy(() => import('./pages/DisponibilidadDocentePage'))
const DocenteDetailPage = lazy(() => import('./pages/secciones/DocenteDetailPage'))
const DocentesPage = lazy(() => import('./pages/secciones/DocentesPage'))
const EgresadosPage = lazy(() => import('./pages/EgresadosPage'))
const EquivalenciasPage = lazy(() => import('./pages/EquivalenciasPage'))
const ExpedienteAlumnoPage = lazy(() => import('./pages/ExpedienteAlumnoPage'))
const FichasDocentesPage = lazy(() => import('./pages/FichasDocentesPage'))
const FichasSindicalesPage = lazy(() => import('./pages/FichasSindicalesPage'))
const FuncionesPage = lazy(() => import('./pages/secciones/FuncionesPage'))
const GestionAcademicaIndexPage = lazy(() => import('./pages/GestionAcademicaIndexPage'))
const GestionAcademicaPage = lazy(() => import('./pages/GestionAcademicaPage'))
const GrupoDetailPage = lazy(() => import('./pages/secciones/GrupoDetailPage'))
const GruposPage = lazy(() => import('./pages/secciones/GruposPage'))
const MallaPage = lazy(() => import('./pages/secciones/MallaPage'))
const MateriasPage = lazy(() => import('./pages/secciones/MateriasPage'))
const MiCvPage = lazy(() => import('./pages/MiCvPage'))
const MiHorarioDocentePage = lazy(() => import('./pages/MiHorarioDocentePage'))
const MovilidadEstudiantilPage = lazy(() => import('./pages/MovilidadEstudiantilPage'))
const PaseListaPage = lazy(() => import('./pages/PaseListaPage'))
const PermisosSindicalesPage = lazy(() => import('./pages/PermisosSindicalesPage'))
const PitAdminPage = lazy(() => import('./pages/PitAdminPage'))
const PlanAccionTutorialPage = lazy(() => import('./pages/PlanAccionTutorialPage'))
const PlaneacionConfirmarEnvioPage = lazy(() => import('./pages/PlaneacionConfirmarEnvioPage'))
const PlaneacionDocentePage = lazy(() => import('./pages/PlaneacionDocentePage'))
const PlaneacionEditorPage = lazy(() => import('./pages/PlaneacionEditorPage'))
const PlaneacionRevisionPage = lazy(() => import('./pages/PlaneacionRevisionPage'))
const PlaneacionesPage = lazy(() => import('./pages/secciones/PlaneacionesPage'))
const ProgramasDistanciaPage = lazy(() => import('./pages/ProgramasDistanciaPage'))
const ReportesDirectivosPage = lazy(() => import('./pages/ReportesDirectivosPage'))
const SeguimientoDistanciaPage = lazy(() => import('./pages/SeguimientoDistanciaPage'))
const SesionesTutoriaPage = lazy(() => import('./pages/SesionesTutoriaPage'))
const TrasladosPage = lazy(() => import('./pages/TrasladosPage'))
const TutoriasPage = lazy(() => import('./pages/secciones/TutoriasPage'))

export const academicoRoutes = (
  <>
        <Route path="/jefe-carrera/dashboard" element={
          <ProtectedRoute requiredRole={['jefe_carrera']}>
            <Layout><DashboardJefeCarreraPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/alumnos/:id/expediente"   element={<AdminLayout><ExpedienteAlumnoPage /></AdminLayout>} />
        <Route path="/admin/alertas-baja-definitiva" element={<AdminLayout><AlertasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica"              element={<AdminLayout><GestionAcademicaIndexPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/materias"     element={<AdminLayout><MateriasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/docentes"     element={<AdminLayout><DocentesPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/docentes/:id" element={<AdminLayout><DocenteDetailPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/malla"        element={<AdminLayout><MallaPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/grupos"       element={<AdminLayout><GruposPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/grupos/:id"   element={<AdminLayout><GrupoDetailPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/aulas"              element={<AdminLayout><AulasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/fichas-docentes"         element={<AdminLayout><FichasDocentesPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/asistencias" element={
          <ProtectedRoute requiredRole={['jefe_carrera', ...ADMIN_ROLES]}>
            <Layout><AsistenciasPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/docente/asistencias" element={
          <ProtectedRoute requiredRole={['docente']}>
            <Layout><AsistenciasPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/gestion-academica/asistencias/pase/:cargaId" element={
          <ProtectedRoute requiredRole={['docente', 'jefe_carrera', ...ADMIN_ROLES]}>
            <Layout><PaseListaPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/docente/asistencias/pase/:cargaId" element={
          <ProtectedRoute requiredRole={['docente', 'jefe_carrera', ...ADMIN_ROLES]}>
            <Layout><PaseListaPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/gestion-academica/calificaciones" element={
          <ProtectedRoute requiredRole={['jefe_carrera', ...ADMIN_ROLES]}>
            <Layout><CalificacionesPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/docente/calificaciones" element={
          <ProtectedRoute requiredRole={['docente']}>
            <Layout><CalificacionesPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/alertas-inasistencia"                       element={<AdminLayout><AlertasInasistenciaPage /></AdminLayout>} />
        <Route path="/gestion-academica/alertas-corte-captura" element={
          <ProtectedRoute requiredRole={['docente', 'jefe_carrera', ...ADMIN_ROLES]}>
            <Layout><AlertasCorteCapturaPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/reportes/carga-academica"                   element={<AdminLayout><CargaAcademicaPersonalPage /></AdminLayout>} />
        <Route path="/admin/egresados"                                  element={<AdminLayout><EgresadosPage /></AdminLayout>} />
        <Route path="/admin/reportes/directivos"                        element={<AdminLayout><ReportesDirectivosPage /></AdminLayout>} />
        <Route path="/admin/indicadores/asistencia"                     element={<AdminLayout><DashboardAsistenciaPage /></AdminLayout>} />
        <Route path="/admin/indicadores/tutoria"                        element={<AdminLayout><DashboardTutoriaPage /></AdminLayout>} />
        <Route path="/admin/pit/asignaciones"                           element={<AdminLayout><PitAdminPage /></AdminLayout>} />
        <Route path="/docente/pit/sesiones" element={
          <ProtectedRoute requiredRole={['docente', 'jefe_carrera', ...ADMIN_ROLES]}>
            <Layout><SesionesTutoriaPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/docente/pit/pat" element={
          <ProtectedRoute requiredRole={['docente', 'jefe_carrera', ...ADMIN_ROLES]}>
            <Layout><PlanAccionTutorialPage /></Layout>
          </ProtectedRoute>
        } />
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
        <Route path="/admin/gestion-academica/cargas"       element={<AdminLayout><CargasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/cargas/builder" element={<AdminLayout><CargaBuilderPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/horarios/diagnostico" element={<AdminLayout><DiagnosticoHorarioPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/horarios/buscar" element={<AdminLayout><BuscarDisponibilidadPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/planeaciones" element={
          <ProtectedRoute requiredRole={[...ADMIN_ROLES, 'subdireccion_academica', 'desarrollo_academico']}>
            <Layout><PlaneacionesPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/gestion-academica/planeaciones/:id" element={
          <ProtectedRoute requiredRole={[...ADMIN_ROLES, 'subdireccion_academica', 'desarrollo_academico']}>
            <Layout><PlaneacionRevisionPage /></Layout>
          </ProtectedRoute>
        } />
        {/* Rutas propias de Desarrollo Académico — mismos componentes que las de arriba,
            bajo su propio namespace de URL en vez de compartir /admin/gestion-academica/*. */}
        <Route path="/desarrollo-academico/planeaciones" element={
          <ProtectedRoute requiredRole={['desarrollo_academico']}>
            <Layout><PlaneacionesPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/desarrollo-academico/planeaciones/:id" element={
          <ProtectedRoute requiredRole={['desarrollo_academico']}>
            <Layout><PlaneacionRevisionPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/gestion-academica/tutorias"     element={<AdminLayout><TutoriasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/funciones"    element={<AdminLayout><FuncionesPage /></AdminLayout>} />
        {/* Legacy tab view — kept for reference */}
        <Route path="/admin/gestion-academica/legacy"       element={<AdminLayout><GestionAcademicaPage /></AdminLayout>} />
        <Route path="/admin/carga-academica"           element={<AdminLayout><CargaAcademicaAdminPage /></AdminLayout>} />
        <Route path="/admin/horarios/builder"          element={<AdminLayout><BuilderHorarioPage /></AdminLayout>} />
        <Route path="/admin/horarios/disponibilidad"   element={<AdminLayout><DisponibilidadDocentePage /></AdminLayout>} />
        <Route path="/docente/planeacion" element={
          <ProtectedRoute requiredRole={['docente', 'jefe_carrera', ...ADMIN_ROLES]}>
            <Layout><PlaneacionDocentePage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/docente/planeacion/:cargaId" element={
          <ProtectedRoute requiredRole={['docente', 'jefe_carrera', ...ADMIN_ROLES]}>
            <Layout><PlaneacionEditorPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/docente/planeacion/:cargaId/confirmar" element={
          <ProtectedRoute requiredRole={['docente', 'jefe_carrera', ...ADMIN_ROLES]}>
            <Layout><PlaneacionConfirmarEnvioPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/docente/mi-cv" element={
          <ProtectedRoute requiredRole={['docente', 'jefe_carrera', 'director_academico', ...ADMIN_ROLES]}>
            <Layout><MiCvPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/docente/mi-horario" element={
          <ProtectedRoute requiredRole={['docente', 'jefe_carrera', ...ADMIN_ROLES]}>
            <Layout><MiHorarioDocentePage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/docente/disponibilidad" element={
          <ProtectedRoute requiredRole={['docente', 'jefe_carrera', ...ADMIN_ROLES]}>
            <Layout><DisponibilidadDocentePage /></Layout>
          </ProtectedRoute>
        } />
        {/* Sprint 28 — Portal del Egresado (bolsa de trabajo e indicadores) */}
        <Route path="/bolsa-trabajo" element={<AdminLayout><BolsaTrabajoPage /></AdminLayout>} />
        <Route path="/docente" element={
          <ProtectedRoute requiredRole="docente">
            <Layout><DashboardDocentePage /></Layout>
          </ProtectedRoute>
        } />
  </>
)

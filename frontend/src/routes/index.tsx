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
        <Route path="/admin/alumnos"        element={<AdminLayout><AlumnosPage /></AdminLayout>} />
        <Route path="/admin/alumnos/:id"    element={<AdminLayout><AlumnoDetailPage /></AdminLayout>} />
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
        <Route path="/admin/gestion-academica/aulas"        element={<AdminLayout><AulasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/cargas"       element={<AdminLayout><CargasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/cargas/builder" element={<AdminLayout><CargaBuilderPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/horarios"     element={<AdminLayout><HorariosPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/planeaciones" element={<AdminLayout><PlaneacionesPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/tutorias"     element={<AdminLayout><TutoriasPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica/funciones"    element={<AdminLayout><FuncionesPage /></AdminLayout>} />
        {/* Legacy tab view — kept for reference */}
        <Route path="/admin/gestion-academica/legacy"       element={<AdminLayout><GestionAcademicaPage /></AdminLayout>} />
        <Route path="/admin/carga-academica"           element={<AdminLayout><CargaAcademicaAdminPage /></AdminLayout>} />
        <Route path="/docente/planeacion"              element={<AdminLayout><PlaneacionDocentePage /></AdminLayout>} />

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

        {/* Placeholders futuros sprints */}
        <Route path="/docente" element={<ProtectedRoute requiredRole="docente"><div style={{padding:32}}>Portal Docente — Sprint 4</div></ProtectedRoute>} />
        <Route path="/sin-acceso" element={<div style={{padding:32,color:'#dc3545'}}>Sin permisos para acceder a esta sección.</div>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}

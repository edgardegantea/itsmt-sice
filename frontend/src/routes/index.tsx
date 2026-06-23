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
const DashboardAlumnoPage      = lazy(() => import('../features/alumno/pages/DashboardAlumnoPage'))
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
const CargaAcademicaAdminPage         = lazy(() => import('../features/academico/pages/CargaAcademicaAdminPage'))
const PlaneacionDocentePage           = lazy(() => import('../features/academico/pages/PlaneacionDocentePage'))

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
        <Route path="/admin/usuarios"                  element={<AdminLayout><UsuariosPage /></AdminLayout>} />
        <Route path="/admin/usuarios/:id"              element={<AdminLayout><UsuarioDetailPage /></AdminLayout>} />
        <Route path="/admin/directorio"               element={<AdminLayout><DirectorioPage /></AdminLayout>} />
        <Route path="/admin/permisos"                  element={<AdminLayout><PermisosPage /></AdminLayout>} />
        <Route path="/admin/gestion-academica"         element={<AdminLayout><GestionAcademicaPage /></AdminLayout>} />
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
          path="/alumno/encuesta-socioeconomica"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AlumnoLayout><EncuestaSocioeconomicaPage /></AlumnoLayout>
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

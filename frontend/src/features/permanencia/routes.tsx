import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'
import AlumnoLayout from '@/layouts/AlumnoLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

const BajasAdminPage = lazy(() => import('./pages/BajasAdminPage'))
const BajaDetailPage = lazy(() => import('./pages/BajaDetailPage'))
const ConstanciasAdminPage = lazy(() => import('./pages/ConstanciasAdminPage'))
const EncuestaSocioeconomicaPage = lazy(() => import('./pages/EncuestaSocioeconomicaPage'))
const EncuestasAdminPage = lazy(() => import('./pages/EncuestasAdminPage'))
const ReinscripcionesAdminPage = lazy(() => import('./pages/ReinscripcionesAdminPage'))
const ReporteAltasBajasPage = lazy(() => import('./pages/ReporteAltasBajasPage'))
const TramitesAlumnoPage = lazy(() => import('./pages/TramitesAlumnoPage'))

export const permanenciaRoutes = (
  <>
        <Route path="/admin/reinscripciones"          element={<AdminLayout><ReinscripcionesAdminPage /></AdminLayout>} />
        <Route path="/admin/constancias"             element={<AdminLayout><ConstanciasAdminPage /></AdminLayout>} />
        <Route path="/admin/encuestas-socioeconomicas" element={<AdminLayout><EncuestasAdminPage /></AdminLayout>} />
        <Route path="/admin/bajas"                   element={<AdminLayout><BajasAdminPage /></AdminLayout>} />
        <Route path="/admin/bajas/:id"                element={<AdminLayout><BajaDetailPage /></AdminLayout>} />
        <Route path="/admin/reportes/altas-bajas"    element={<AdminLayout><ReporteAltasBajasPage /></AdminLayout>} />
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
  </>
)

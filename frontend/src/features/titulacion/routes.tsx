import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'
import AlumnoLayout from '@/layouts/AlumnoLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

const CertificadosIdiomaAdminPage = lazy(() => import('./pages/CertificadosIdiomaAdminPage'))
const SalidaLateralAdminPage = lazy(() => import('./pages/SalidaLateralAdminPage'))
const SolicitudesActoAdminPage = lazy(() => import('./pages/SolicitudesActoAdminPage'))
const TitulacionAlumnoPage = lazy(() => import('./pages/TitulacionAlumnoPage'))

export const titulacionRoutes = (
  <>
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
  </>
)

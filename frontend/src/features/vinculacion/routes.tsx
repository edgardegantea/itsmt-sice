import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'
import AlumnoLayout from '@/layouts/AlumnoLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

const AsesoriasRpPage = lazy(() => import('./pages/AsesoriasRpPage'))
const ResidenciasAdminPage = lazy(() => import('./pages/ResidenciasAdminPage'))
const ServicioSocialAdminPage = lazy(() => import('./pages/ServicioSocialAdminPage'))
const SolicitudesRpAdminPage = lazy(() => import('./pages/SolicitudesRpAdminPage'))
const VinculacionAlumnoPage = lazy(() => import('./pages/VinculacionAlumnoPage'))

export const vinculacionRoutes = (
  <>
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
  </>
)

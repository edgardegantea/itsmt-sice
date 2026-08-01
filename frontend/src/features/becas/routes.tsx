import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'
import AlumnoLayout from '@/layouts/AlumnoLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

const BecasAdminPage = lazy(() => import('./pages/BecasAdminPage'))
const BecasAlumnoPage = lazy(() => import('./pages/BecasAlumnoPage'))

export const becasRoutes = (
  <>
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
  </>
)

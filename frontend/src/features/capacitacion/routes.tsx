import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ADMIN_ROLES } from '../../routes/AdminLayout'
import { AdminLayout } from '../../routes/AdminLayout'
import Layout from '@/layouts/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'

const CursosCapacitacionPage = lazy(() => import('./pages/CursosCapacitacionPage'))

export const capacitacionRoutes = (
  <>
        <Route path="/admin/capacitacion/cursos"    element={<AdminLayout><CursosCapacitacionPage /></AdminLayout>} />
        <Route
          path="/docente/capacitacion"
          element={
            <ProtectedRoute requiredRole={[...ADMIN_ROLES, 'docente', 'direccion_academica', 'subdireccion_academica']}>
              <Layout><CursosCapacitacionPage /></Layout>
            </ProtectedRoute>
          }
        />
  </>
)

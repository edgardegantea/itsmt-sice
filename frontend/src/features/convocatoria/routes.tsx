import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'
import AlumnoLayout from '@/layouts/AlumnoLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

const ConvocatoriasPage = lazy(() => import('./pages/ConvocatoriasPage'))
const MisPostulacionesPage = lazy(() => import('./pages/MisPostulacionesPage'))

export const convocatoriaRoutes = (
  <>
        <Route path="/admin/convocatorias"                              element={<AdminLayout><ConvocatoriasPage /></AdminLayout>} />
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
  </>
)

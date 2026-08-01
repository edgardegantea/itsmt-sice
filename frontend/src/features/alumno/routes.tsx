import { lazy } from 'react'
import { Route } from 'react-router-dom'
import AlumnoLayout from '@/layouts/AlumnoLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

const AsistenciaCheckinPage = lazy(() => import('./pages/AsistenciaCheckinPage'))
const DashboardAlumnoPage = lazy(() => import('./pages/DashboardAlumnoPage'))
const PrecargaAcademicaPage = lazy(() => import('./pages/PrecargaAcademicaPage'))

export const alumnoRoutes = (
  <>
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
          path="/asistencia/checkin/:sesionId"
          element={
            <ProtectedRoute requiredRole="alumno">
              <AsistenciaCheckinPage />
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
  </>
)

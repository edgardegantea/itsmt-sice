import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'
import AlumnoLayout from '@/layouts/AlumnoLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

const ActividadesComplementariasPage = lazy(() => import('./pages/ActividadesComplementariasPage'))
const EvaluacionDocenteAmpliadaPage = lazy(() => import('./pages/EvaluacionDocenteAmpliadaPage'))
const EvaluacionDocentePage = lazy(() => import('./pages/EvaluacionDocentePage'))
const ResultadosEvaluacionPage = lazy(() => import('./pages/ResultadosEvaluacionPage'))

export const calidadRoutes = (
  <>
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
        {/* Sprint 29 — Evaluación Docente ampliada (esqueleto) */}
        <Route path="/admin/evaluacion-docente-ampliada" element={<AdminLayout><EvaluacionDocenteAmpliadaPage /></AdminLayout>} />
  </>
)

import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ADMIN_ROLES } from '../../routes/AdminLayout'
import { AdminLayout } from '../../routes/AdminLayout'
import Layout from '@/layouts/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'

const AsignacionesDocentesPage = lazy(() => import('./pages/AsignacionesDocentesPage'))
const InstrumentacionDidacticaPage = lazy(() => import('./pages/InstrumentacionDidacticaPage'))

export const planeacionRoutes = (
  <>
        <Route path="/desarrollo-academico/instrumentaciones" element={
          <ProtectedRoute requiredRole={['desarrollo_academico']}>
            <Layout><InstrumentacionDidacticaPage /></Layout>
          </ProtectedRoute>
        } />
        {/* Sprint 9 — Planeación Académica */}
        <Route path="/admin/planeacion/asignaciones"      element={<AdminLayout><AsignacionesDocentesPage /></AdminLayout>} />
        <Route
          path="/admin/planeacion/instrumentaciones"
          element={
            <ProtectedRoute requiredRole={[...ADMIN_ROLES, 'docente', 'direccion_academica', 'subdireccion_academica', 'desarrollo_academico']}>
              <Layout><InstrumentacionDidacticaPage /></Layout>
            </ProtectedRoute>
          }
        />
  </>
)

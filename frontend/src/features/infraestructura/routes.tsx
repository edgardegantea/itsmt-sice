import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'

const InfraestructuraPage = lazy(() => import('./pages/InfraestructuraPage'))

export const infraestructuraRoutes = (
  <>
        {/* Sprint 27 — Infraestructura y Recursos */}
        <Route path="/admin/infraestructura" element={<AdminLayout><InfraestructuraPage /></AdminLayout>} />
  </>
)

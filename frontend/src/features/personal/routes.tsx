import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'

const ComisionesPage = lazy(() => import('./pages/ComisionesPage'))
const SolicitudesPersonalPage = lazy(() => import('./pages/SolicitudesPersonalPage'))

export const personalRoutes = (
  <>
        {/* Sprint 10 — Gestión de Personal Docente */}
        <Route path="/admin/personal/solicitudes"   element={<AdminLayout><SolicitudesPersonalPage /></AdminLayout>} />
        <Route path="/admin/personal/comisiones"    element={<AdminLayout><ComisionesPage /></AdminLayout>} />
  </>
)

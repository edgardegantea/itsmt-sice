import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'

const EstadoCuentaAdminPage = lazy(() => import('./pages/EstadoCuentaAdminPage'))

export const finanzasRoutes = (
  <>
        {/* Sprint 22 — Finanzas y Estado de Cuenta */}
        <Route path="/admin/finanzas/estado-cuenta" element={<AdminLayout><EstadoCuentaAdminPage /></AdminLayout>} />
  </>
)

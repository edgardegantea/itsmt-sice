import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

const AuditLogPage = lazy(() => import('./pages/AuditLogPage'))
const IncidentesSeguridadPage = lazy(() => import('./pages/IncidentesSeguridadPage'))
const SeguridadCuentaPage = lazy(() => import('./pages/SeguridadCuentaPage'))

export const seguridadRoutes = (
  <>
        {/* Sprint 30 — Auditoría y Trazabilidad */}
        <Route path="/admin/auditoria" element={<AdminLayout><AuditLogPage /></AdminLayout>} />
        {/* Sprint 31 — Seguridad Informática */}
        <Route path="/seguridad/mi-cuenta" element={<ProtectedRoute><SeguridadCuentaPage /></ProtectedRoute>} />
        <Route path="/admin/incidentes-seguridad" element={<AdminLayout><IncidentesSeguridadPage /></AdminLayout>} />
  </>
)

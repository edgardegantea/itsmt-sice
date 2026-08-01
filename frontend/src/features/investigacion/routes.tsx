import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'

const InvestigacionPage = lazy(() => import('./pages/InvestigacionPage'))

export const investigacionRoutes = (
  <>
        {/* Sprint 26 — Cuerpos Académicos e Investigación */}
        <Route path="/admin/investigacion" element={<AdminLayout><InvestigacionPage /></AdminLayout>} />
  </>
)

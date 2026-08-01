import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'

const CalendarioEscolarPage = lazy(() => import('./pages/CalendarioEscolarPage'))

export const reinscripcionRoutes = (
  <>
        {/* Sprint 21 — Reinscripción Oficial TecNM */}
        <Route path="/admin/calendario-escolar" element={<AdminLayout><CalendarioEscolarPage /></AdminLayout>} />
  </>
)

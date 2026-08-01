import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'

const IndicadoresPage = lazy(() => import('./pages/IndicadoresPage'))

export const analiticaRoutes = (
  <>
        {/* Sprint 8 — Analítica */}
        <Route path="/admin/analitica/indicadores" element={<AdminLayout><IndicadoresPage /></AdminLayout>} />
  </>
)

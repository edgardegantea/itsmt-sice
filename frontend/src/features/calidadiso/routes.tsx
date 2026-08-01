import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'

const CalidadPage = lazy(() => import('./pages/CalidadPage'))

export const calidadisoRoutes = (
  <>
        {/* Sprint 25 — Acreditación y Calidad ISO/CACEI */}
        <Route path="/admin/calidad-iso" element={<AdminLayout><CalidadPage /></AdminLayout>} />
  </>
)

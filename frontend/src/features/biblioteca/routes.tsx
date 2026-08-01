import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'

const BibliotecaPage = lazy(() => import('./pages/BibliotecaPage'))

export const bibliotecaRoutes = (
  <>
        {/* Sprint 24 — Biblioteca */}
        <Route path="/biblioteca" element={<AdminLayout><BibliotecaPage /></AdminLayout>} />
  </>
)

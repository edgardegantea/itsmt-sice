import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'

const AlumnoDetailPage = lazy(() => import('./pages/AlumnoDetailPage'))
const AlumnosPage = lazy(() => import('./pages/AlumnosPage'))
const AspiranteDetailPage = lazy(() => import('./pages/AspiranteDetailPage'))
const AspirantesPage = lazy(() => import('./pages/AspirantesPage'))
const ConsultaAspirantePage = lazy(() => import('./pages/ConsultaAspirantePage'))
const LibroRegistroNcPage = lazy(() => import('./pages/LibroRegistroNcPage'))
const RegistroAspirantePage = lazy(() => import('./pages/RegistroAspirantePage'))

export const admisionRoutes = (
  <>
        <Route path="/registro"           element={<RegistroAspirantePage />} />
        <Route path="/aspirante/consulta" element={<ConsultaAspirantePage />} />
        <Route path="/admin/aspirantes"     element={<AdminLayout><AspirantesPage /></AdminLayout>} />
        <Route path="/admin/aspirantes/:id" element={<AdminLayout><AspiranteDetailPage /></AdminLayout>} />
        <Route path="/admin/alumnos"                  element={<AdminLayout><AlumnosPage /></AdminLayout>} />
        <Route path="/admin/alumnos/:id"              element={<AdminLayout><AlumnoDetailPage /></AdminLayout>} />
        <Route path="/admin/libro-registro-nc"        element={<AdminLayout><LibroRegistroNcPage /></AdminLayout>} />
  </>
)

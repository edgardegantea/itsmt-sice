import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '../../routes/AdminLayout'

const CarrerasPage = lazy(() => import('./pages/CarrerasPage'))
const CatalogosPage = lazy(() => import('./pages/CatalogosPage'))
const ConfiguracionPage = lazy(() => import('./pages/ConfiguracionPage'))
const DashboardAdminPage = lazy(() => import('./pages/DashboardAdminPage'))
const DirectorioPage = lazy(() => import('./pages/DirectorioPage'))
const PeriodosPage = lazy(() => import('./pages/PeriodosPage'))
const PermisosPage = lazy(() => import('./pages/PermisosPage'))
const UsuarioDetailPage = lazy(() => import('./pages/UsuarioDetailPage'))
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'))
const ApiKeysPage = lazy(() => import('./pages/ApiKeysPage'))

export const adminRoutes = (
  <>
        {/* Admin */}
        <Route path="/admin"            element={<AdminLayout><DashboardAdminPage /></AdminLayout>} />
        <Route path="/admin/periodos"   element={<AdminLayout><PeriodosPage /></AdminLayout>} />
        <Route path="/admin/carreras"   element={<AdminLayout><CarrerasPage /></AdminLayout>} />
        <Route path="/admin/catalogos"        element={<AdminLayout><CatalogosPage /></AdminLayout>} />
        <Route path="/admin/configuracion"  element={<AdminLayout><ConfiguracionPage /></AdminLayout>} />
        <Route path="/admin/usuarios"                  element={<AdminLayout><UsuariosPage /></AdminLayout>} />
        <Route path="/admin/usuarios/:id"              element={<AdminLayout><UsuarioDetailPage /></AdminLayout>} />
        <Route path="/admin/directorio"               element={<AdminLayout><DirectorioPage /></AdminLayout>} />
        <Route path="/admin/permisos"                  element={<AdminLayout><PermisosPage /></AdminLayout>} />
        <Route path="/admin/api-keys"                  element={<AdminLayout><ApiKeysPage /></AdminLayout>} />
  </>
)

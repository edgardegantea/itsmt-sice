import { lazy } from 'react'
import { Route } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import Layout from '../../layouts/Layout'

const ComunicadosPage = lazy(() => import('./pages/ComunicadosPage'))
const AdminComunicadosPage = lazy(() => import('./pages/AdminComunicadosPage'))
const AcusesOficialesPage = lazy(() => import('./pages/AcusesOficialesPage'))

export const EMPLEADOS_ROLES = [
  'superadmin',
  'admin',
  'director_academico',
  'direccion_general',
  'direccion_academica',
  'subdireccion_academica',
  'control_escolar',
  'jefe_carrera',
  'docente',
  'personal_administrativo',
  'desarrollo_academico',
]

export const comunicacionRoutes = (
  <>
    <Route
      path="/comunicados"
      element={
        <ProtectedRoute requiredRole={EMPLEADOS_ROLES}>
          <Layout>
            <ComunicadosPage />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/comunicados/oficio-circular"
      element={
        <ProtectedRoute requiredRole={EMPLEADOS_ROLES}>
          <Layout>
            <AcusesOficialesPage />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/comunicados/admin"
      element={
        <ProtectedRoute requiredRole={['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'direccion_general', 'direccion_academica', 'subdireccion_academica']}>
          <Layout>
            <AdminComunicadosPage />
          </Layout>
        </ProtectedRoute>
      }
    />
  </>
)

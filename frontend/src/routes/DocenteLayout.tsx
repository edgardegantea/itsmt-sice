import React from 'react'
import ProtectedRoute from '../components/ProtectedRoute'
import Layout from '../layouts/Layout'

export const DOCENTE_ROLES = ['superadmin', 'admin', 'docente', 'jefe_carrera']

export function DocenteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={DOCENTE_ROLES}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default DocenteLayout

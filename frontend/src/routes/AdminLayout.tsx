import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/layouts/Layout'

export const ADMIN_ROLES = ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'personal_administrativo']

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={ADMIN_ROLES}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

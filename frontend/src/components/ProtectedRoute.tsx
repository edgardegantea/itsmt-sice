import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface Props {
  children: React.ReactNode
  requiredRole?: string | string[]
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { token, user } = useAuthStore()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  // El superadmin es el rol de más alto nivel: pasa cualquier candado de ruta sin
  // importar qué roles pida esa ruta en particular, igual que en el backend (ver el
  // override de hasRole/hasAnyRole en App\Models\User).
  const userRoles = Array.isArray(user?.roles) ? user.roles : []
  const esSuperadmin = userRoles.includes('superadmin')

  if (requiredRole && !esSuperadmin) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowed.some(r => userRoles.includes(r))) {
      return <Navigate to="/sin-acceso" replace />
    }
  }

  return <>{children}</>
}

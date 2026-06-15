import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi, type LoginPayload } from '../services/auth'
import { useAuthStore } from '../../../store/authStore'

function destinoSegunRol(roles: string[]): string {
  if (roles.includes('admin'))                   return '/admin'
  if (roles.includes('director_academico'))      return '/admin'
  if (roles.includes('personal_administrativo')) return '/admin/aspirantes'
  if (roles.includes('jefe_carrera'))            return '/admin/aspirantes'
  if (roles.includes('docente'))                return '/docente'
  if (roles.includes('alumno'))                 return '/alumno/dashboard'
  return '/login'
}

export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: ({ token, user }) => {
      setAuth(token, user)
      navigate(destinoSegunRol(user.roles))
    },
  })
}

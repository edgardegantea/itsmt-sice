import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi, type LoginPayload } from '../services/auth'
import { useAuthStore } from '../../../store/authStore'

function destinoSegunRol(roles: string[]): string {
  if (roles.includes('superadmin'))              return '/admin'
  if (roles.includes('admin'))                   return '/admin'
  if (roles.includes('director_academico'))      return '/admin'
  if (roles.includes('personal_administrativo')) return '/admin/aspirantes'
  if (roles.includes('jefe_carrera'))            return '/admin/aspirantes'
  if (roles.includes('docente'))                 return '/docente'
  if (roles.includes('alumno'))                  return '/alumno/dashboard'
  return '/login'
}

export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [challengeToken, setChallengeToken] = useState<string | null>(null)

  const login = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (result) => {
      if ('token' in result) {
        setAuth(result.token, result.user)
        navigate(destinoSegunRol(result.user.roles))
        return
      }
      setChallengeToken(result.challenge_token)
    },
  })

  const verificar2fa = useMutation({
    mutationFn: (codigo: string) => authApi.verificarDosFactores({ challenge_token: challengeToken!, codigo }),
    onSuccess: ({ token, user }) => {
      setChallengeToken(null)
      setAuth(token, user)
      navigate(destinoSegunRol(user.roles))
    },
  })

  return { login, verificar2fa, challengeToken, cancelar2fa: () => setChallengeToken(null) }
}
